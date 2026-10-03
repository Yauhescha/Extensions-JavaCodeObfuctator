/*
 * Java Code Privacy Helper - reversible Java identifier obfuscation.
 * Runs locally in the browser extension. No network calls here.
 *
 * This is a pragmatic tokenizer + declaration detector, not a full Java compiler.
 * It is intended for ChatGPT snippets, not whole-project refactoring.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.JavaCodePrivacyHelper = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const JAVA_KEYWORDS = new Set([
    'abstract','assert','boolean','break','byte','case','catch','char','class','const','continue','default','do',
    'double','else','enum','extends','final','finally','float','for','goto','if','implements','import','instanceof',
    'int','interface','long','native','new','package','private','protected','public','record','return','sealed','short',
    'static','strictfp','super','switch','synchronized','this','throw','throws','transient','try','var','void','volatile','while',
    'yield','permits','non-sealed','true','false','null'
  ]);

  const COMMON_JAVA_TYPES = new Set([
    'String','Integer','Long','Boolean','Double','Float','Short','Byte','Character','Object','Optional','List','Set','Map',
    'HashMap','HashSet','ArrayList','LinkedList','BigDecimal','BigInteger','LocalDate','LocalTime','LocalDateTime','Instant',
    'UUID','Date','Duration','Exception','RuntimeException','Throwable','ResponseEntity','HttpStatus',
    'Collection','Collections','Arrays','Stream','Collectors','Comparator','Objects','Math',
    'Iterable','Iterator','Class','ClassLoader','Thread','Runnable','Serializable'
  ]);

  const CONTROL_WORDS = new Set(['if','for','while','switch','catch','synchronized','try','do','else','new','return','throw']);
  const MODIFIERS = new Set(['public','private','protected','static','final','abstract','native','synchronized','transient','volatile','strictfp','default']);
  const PRIMITIVES_AND_VOID = new Set(['byte','short','int','long','float','double','boolean','char','void']);

  const DEFAULT_OPTIONS = {
    renameClasses: true,
    renameMethods: true,
    renameFields: true,
    renameLocals: true,
    renameParameters: true,
    renameTypeReferences: true,
    preserveAnnotations: true,
    preserveConstants: true,
    preservePublicApi: false,
    placeholderPrefix: 'JCPH',
    obfuscateInsideComments: false,
    obfuscateInsideStrings: false
  };

  function mergeOptions(options) {
    return Object.assign({}, DEFAULT_OPTIONS, options || {});
  }

  function isIdentifierStart(ch) {
    return /[A-Za-z_$]/.test(ch || '');
  }

  function isIdentifierPart(ch) {
    return /[A-Za-z0-9_$]/.test(ch || '');
  }

  function isIdentifierToken(token) {
    return token && token.type === 'identifier' && !JAVA_KEYWORDS.has(token.value);
  }

  function isTypeLikeToken(token) {
    if (!token) return false;
    if (token.type === 'identifier') return true;
    if (token.type === 'keyword' && PRIMITIVES_AND_VOID.has(token.value)) return true;
    return false;
  }

  function isUpperSnake(name) {
    return /^[A-Z][A-Z0-9_]*$/.test(name || '') && (name || '').includes('_');
  }


  function isCommonTypeName(name) {
    return PRIMITIVES_AND_VOID.has(name) || COMMON_JAVA_TYPES.has(name);
  }

  function isProbableTypeName(name) {
    return /^[A-Z_$]/.test(name || '');
  }

  function buildStatementContext(tokens) {
    const packageIndices = new Set();
    const importIndices = new Set();
    const importLeafIndices = new Set();

    for (let i = 0; i < tokens.length; i++) {
      const value = tokens[i].value;
      if (value !== 'package' && value !== 'import') continue;

      const target = value === 'package' ? packageIndices : importIndices;
      let j = i;
      while (j < tokens.length) {
        target.add(j);
        if (tokens[j].value === ';') break;
        j++;
      }

      if (value === 'import') {
        let semi = j;
        let lastMeaningful = -1;
        for (let k = semi - 1; k > i; k--) {
          if (tokens[k].type === 'space' || tokens[k].type === 'comment') continue;
          lastMeaningful = k;
          break;
        }

        if (lastMeaningful >= 0 && tokens[lastMeaningful].value !== '*') {
          const afterImport = nextNonSpace(tokens, i);
          if (afterImport >= 0 && tokens[afterImport].value === 'static') {
            // import static a.b.Type.member; -> Type is usually before the final .member
            let dotsSeen = 0;
            for (let k = lastMeaningful - 1; k > i; k--) {
              if (tokens[k].type === 'space' || tokens[k].type === 'comment') continue;
              if (tokens[k].value === '.') {
                dotsSeen++;
                continue;
              }
              if (dotsSeen >= 1 && tokens[k].type === 'identifier') {
                importLeafIndices.add(k);
                break;
              }
            }
          } else if (tokens[lastMeaningful].type === 'identifier') {
            importLeafIndices.add(lastMeaningful);
          }
        }
      }

      i = Math.max(i, j);
    }

    return { packageIndices, importIndices, importLeafIndices };
  }

  function isInsideSet(set, index) {
    return set && set.has(index);
  }

  function tokenize(code) {
    const tokens = [];
    let i = 0;

    function push(type, value, start, end) {
      tokens.push({ type, value, start, end });
    }

    while (i < code.length) {
      const start = i;
      const ch = code[i];
      const next = code[i + 1];

      if (/\s/.test(ch)) {
        i++;
        while (i < code.length && /\s/.test(code[i])) i++;
        push('space', code.slice(start, i), start, i);
        continue;
      }

      if (ch === '/' && next === '/') {
        i += 2;
        while (i < code.length && code[i] !== '\n') i++;
        push('comment', code.slice(start, i), start, i);
        continue;
      }

      if (ch === '/' && next === '*') {
        i += 2;
        while (i < code.length && !(code[i] === '*' && code[i + 1] === '/')) i++;
        i = Math.min(i + 2, code.length);
        push('comment', code.slice(start, i), start, i);
        continue;
      }

      // Java text blocks: """ ... """
      if (ch === '"' && next === '"' && code[i + 2] === '"') {
        i += 3;
        while (i < code.length && !(code[i] === '"' && code[i + 1] === '"' && code[i + 2] === '"')) i++;
        i = Math.min(i + 3, code.length);
        push('string', code.slice(start, i), start, i);
        continue;
      }

      if (ch === '"' || ch === "'") {
        const quote = ch;
        i++;
        while (i < code.length) {
          if (code[i] === '\\') {
            i += 2;
            continue;
          }
          if (code[i] === quote) {
            i++;
            break;
          }
          i++;
        }
        push('string', code.slice(start, i), start, i);
        continue;
      }

      if (isIdentifierStart(ch)) {
        i++;
        while (i < code.length && isIdentifierPart(code[i])) i++;
        const value = code.slice(start, i);
        push(JAVA_KEYWORDS.has(value) ? 'keyword' : 'identifier', value, start, i);
        continue;
      }

      if (/[0-9]/.test(ch)) {
        i++;
        while (i < code.length && /[A-Za-z0-9_.]/.test(code[i])) i++;
        push('number', code.slice(start, i), start, i);
        continue;
      }

      const three = code.slice(i, i + 3);
      const two = code.slice(i, i + 2);
      if (['>>>','...'].includes(three)) {
        i += 3;
        push('symbol', three, start, i);
        continue;
      }
      if (['==','!=','<=','>=','&&','||','++','--','+=','-=','*=','/=','%=','::','->','<<','>>'].includes(two)) {
        i += 2;
        push('symbol', two, start, i);
        continue;
      }

      i++;
      push('symbol', ch, start, i);
    }

    return tokens;
  }

  function meaningful(tokens) {
    return tokens.filter(t => t.type !== 'space' && t.type !== 'comment');
  }

  function prevNonSpace(tokens, i) {
    for (let j = i - 1; j >= 0; j--) {
      if (tokens[j].type !== 'space' && tokens[j].type !== 'comment') return j;
    }
    return -1;
  }

  function nextNonSpace(tokens, i) {
    for (let j = i + 1; j < tokens.length; j++) {
      if (tokens[j].type !== 'space' && tokens[j].type !== 'comment') return j;
    }
    return -1;
  }

  function findMatching(tokens, openIndex, open, close) {
    let depth = 0;
    for (let i = openIndex; i < tokens.length; i++) {
      if (tokens[i].value === open) depth++;
      if (tokens[i].value === close) {
        depth--;
        if (depth === 0) return i;
      }
    }
    return -1;
  }

  function hasModifierBefore(tokens, idIndex, modifier) {
    let cursor = idIndex;
    for (let steps = 0; steps < 12; steps++) {
      cursor = prevNonSpace(tokens, cursor);
      if (cursor < 0) return false;
      const t = tokens[cursor];
      if (t.value === ';' || t.value === '{' || t.value === '}' || t.value === ')') return false;
      if (t.value === modifier) return true;
    }
    return false;
  }

  function isAnnotationIdentifier(tokens, idIndex) {
    const p = prevNonSpace(tokens, idIndex);
    return p >= 0 && tokens[p].value === '@';
  }

  function isMethodDeclaration(tokens, idIndex) {
    const nameToken = tokens[idIndex];
    if (!isIdentifierToken(nameToken)) return false;
    if (CONTROL_WORDS.has(nameToken.value)) return false;
    const next = nextNonSpace(tokens, idIndex);
    if (next < 0 || tokens[next].value !== '(') return false;
    const close = findMatching(tokens, next, '(', ')');
    if (close < 0) return false;
    let after = nextNonSpace(tokens, close);
    // skip throws clause
    if (after >= 0 && tokens[after].value === 'throws') {
      after = nextNonSpace(tokens, after);
      while (after >= 0 && tokens[after].value !== '{' && tokens[after].value !== ';') {
        after = nextNonSpace(tokens, after);
      }
    }
    if (after < 0 || (tokens[after].value !== '{' && tokens[after].value !== ';')) return false;

    const before = prevNonSpace(tokens, idIndex);
    if (before < 0) return false;
    if (tokens[before].value === '.' || tokens[before].value === '::' || tokens[before].value === 'new') return false;

    // Constructor declarations are handled through class name mapping.
    if (tokens[before].value === '<') return true;
    if (isTypeLikeToken(tokens[before]) || tokens[before].value === ']' || tokens[before].value === '>' || MODIFIERS.has(tokens[before].value)) return true;
    return false;
  }

  function isVariableDeclarationCandidate(tokens, idIndex) {
    const token = tokens[idIndex];
    if (!isIdentifierToken(token)) return false;
    if (isAnnotationIdentifier(tokens, idIndex)) return false;

    const prev = prevNonSpace(tokens, idIndex);
    const next = nextNonSpace(tokens, idIndex);
    if (prev < 0 || next < 0) return false;
    if (tokens[prev].value === '.' || tokens[prev].value === '::' || tokens[next].value === '(') return false;

    // Very pragmatic: identifier after a type-like token and followed by assignment/comma/semicolon/bracket.
    const nextValue = tokens[next].value;
    const validAfter = ['=', ',', ';', ')', '['].includes(nextValue) || nextValue === ':';
    if (!validAfter) return false;

    let before = prev;
    // Handle array suffix between type and var: String [] name
    if (tokens[before].value === ']') {
      const open = prevNonSpace(tokens, before);
      if (open >= 0 && tokens[open].value === '[') before = prevNonSpace(tokens, open);
    }

    if (isTypeLikeToken(tokens[before]) || tokens[before].value === '>' || tokens[before].value === 'var') return true;
    return false;
  }

  function extractParameterIdentifiers(tokens, openParenIndex, closeParenIndex) {
    const result = new Set();
    let depthAngle = 0;
    let depthParen = 0;
    let segmentStart = openParenIndex + 1;

    function processSegment(start, end) {
      let candidate = -1;
      for (let i = end - 1; i >= start; i--) {
        const t = tokens[i];
        if (t.type === 'space' || t.type === 'comment') continue;
        if (t.value === ']') continue;
        if (isIdentifierToken(t) && !isAnnotationIdentifier(tokens, i)) {
          candidate = i;
          break;
        }
      }
      if (candidate >= 0) {
        const n = nextNonSpace(tokens, candidate);
        if (n < 0 || tokens[n].value !== '(') result.add(candidate);
      }
    }

    for (let i = openParenIndex + 1; i < closeParenIndex; i++) {
      const v = tokens[i].value;
      if (v === '<') depthAngle++;
      else if (v === '>') depthAngle = Math.max(0, depthAngle - 1);
      else if (v === '(') depthParen++;
      else if (v === ')') depthParen = Math.max(0, depthParen - 1);
      else if (v === ',' && depthAngle === 0 && depthParen === 0) {
        processSegment(segmentStart, i);
        segmentStart = i + 1;
      }
    }
    processSegment(segmentStart, closeParenIndex);
    return result;
  }

  function collectMappings(code, options) {
    const opts = mergeOptions(options);
    const tokens = meaningful(tokenize(code));
    const originals = new Map();
    const annotationTypeNames = new Set();
    for (let i = 0; i < tokens.length; i++) {
      if (isIdentifierToken(tokens[i]) && isAnnotationIdentifier(tokens, i)) annotationTypeNames.add(tokens[i].value);
    }
    const classNames = new Set();
    const methodNames = new Set();
    const parameterNames = new Set();
    const variableNames = new Set();
    const fieldNames = new Set();
    const typeNames = new Set();

    function add(kind, name) {
      if (!name || JAVA_KEYWORDS.has(name)) return;
      if (opts.preserveConstants && isUpperSnake(name)) return;
      if (!originals.has(name)) originals.set(name, kind);
    }

    function addType(name) {
      if (!opts.renameTypeReferences) return;
      if (!name || JAVA_KEYWORDS.has(name) || isCommonTypeName(name)) return;
      if (opts.preserveAnnotations && annotationTypeNames.has(name)) return;
      if (!isProbableTypeName(name)) return;
      typeNames.add(name);
      add('type', name);
    }

    function collectTypeNamesFromRange(start, end, excludedIndices = new Set()) {
      for (let k = start; k <= end; k++) {
        if (excludedIndices.has(k)) continue;
        const t = tokens[k];
        if (!isIdentifierToken(t)) continue;
        if (isAnnotationIdentifier(tokens, k) && opts.preserveAnnotations) continue;
        addType(t.value);
      }
    }

    function findDeclarationStart(index) {
      let start = index;
      for (let k = index; k >= 0; k--) {
        const v = tokens[k].value;
        if (v === ';' || v === '{' || v === '}' || v === '(' || v === ')' || v === ',') {
          start = k + 1;
          break;
        }
        start = k;
      }
      return start;
    }

    for (let i = 0; i < tokens.length; i++) {
      if (['class','interface','enum','record'].includes(tokens[i].value)) {
        const n = nextNonSpace(tokens, i);
        if (n >= 0 && isIdentifierToken(tokens[n])) {
          classNames.add(tokens[n].value);
          if (opts.renameClasses) add('class', tokens[n].value);
        }

        // Types in extends/implements/permits clauses.
        let j = n >= 0 ? nextNonSpace(tokens, n) : -1;
        while (j >= 0 && tokens[j].value !== '{' && tokens[j].value !== ';') {
          if (isIdentifierToken(tokens[j]) && !['extends','implements','permits'].includes(tokens[j].value)) addType(tokens[j].value);
          j = nextNonSpace(tokens, j);
        }
      }
    }

    // Imported class names. Package segments are not renamed; only the imported type itself is mapped.
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].value !== 'import') continue;
      const isStaticImport = tokens[nextNonSpace(tokens, i)] && tokens[nextNonSpace(tokens, i)].value === 'static';
      const end = (() => {
        let j = i;
        while (j < tokens.length && tokens[j].value !== ';') j++;
        return j;
      })();
      if (!isStaticImport) {
        for (let j = end - 1; j > i; j--) {
          if (tokens[j].value === '*') break;
          if (isIdentifierToken(tokens[j])) { addType(tokens[j].value); break; }
        }
      } else {
        let foundMemberDot = false;
        for (let j = end - 1; j > i; j--) {
          if (tokens[j].value === '.') { foundMemberDot = true; continue; }
          if (foundMemberDot && isIdentifierToken(tokens[j])) { addType(tokens[j].value); break; }
        }
      }
    }

    for (let i = 0; i < tokens.length; i++) {
      if (isMethodDeclaration(tokens, i)) {
        const name = tokens[i].value;
        if (classNames.has(name)) {
          // Constructor follows class mapping, not method mapping.
          if (opts.renameClasses) add('class', name);
        } else if (opts.renameMethods) {
          if (!(opts.preservePublicApi && hasModifierBefore(tokens, i, 'public'))) {
            methodNames.add(name);
            add('method', name);
          }
        }

        // Return type / constructor modifiers before the method name.
        if (!classNames.has(name)) {
          const start = findDeclarationStart(i - 1);
          collectTypeNamesFromRange(start, i - 1);
        }

        const open = nextNonSpace(tokens, i);
        const close = findMatching(tokens, open, '(', ')');
        if (close > open) {
          const params = extractParameterIdentifiers(tokens, open, close);
          const excluded = new Set(params);
          collectTypeNamesFromRange(open + 1, close - 1, excluded);
          if (opts.renameParameters) {
            params.forEach(idx => {
              parameterNames.add(tokens[idx].value);
              add('param', tokens[idx].value);
            });
          }
        }
      }
    }

    for (let i = 0; i < tokens.length; i++) {
      if (isVariableDeclarationCandidate(tokens, i)) {
        const name = tokens[i].value;
        if (parameterNames.has(name)) continue;

        // Type part before the variable name: e.g. `private final CurrentUserService service`.
        const start = findDeclarationStart(i - 1);
        collectTypeNamesFromRange(start, i - 1);

        const kind = hasModifierBefore(tokens, i, 'private') || hasModifierBefore(tokens, i, 'protected') || hasModifierBefore(tokens, i, 'public') ? 'field' : 'local';
        if (kind === 'field') fieldNames.add(name); else variableNames.add(name);
        if ((kind === 'field' && opts.renameFields) || (kind === 'local' && opts.renameLocals)) add(kind, name);
      }
    }

    const counters = { class: 1, type: 1, method: 1, field: 1, param: 1, local: 1 };
    const prefixes = {
      class: opts.placeholderPrefix + '_C_',
      type: opts.placeholderPrefix + '_T_',
      method: opts.placeholderPrefix + '_m_',
      field: opts.placeholderPrefix + '_f_',
      param: opts.placeholderPrefix + '_p_',
      local: opts.placeholderPrefix + '_v_'
    };

    const mapping = {};
    [...originals.entries()]
      .sort((a, b) => b[0].length - a[0].length || a[0].localeCompare(b[0]))
      .forEach(([name, kind]) => {
        mapping[name] = `${prefixes[kind]}${String(counters[kind]++).padStart(3, '0')}`;
      });

    return { mapping, kinds: Object.fromEntries(originals), stats: countKinds(mapping, originals), detected: { classNames, typeNames, methodNames, parameterNames, variableNames, fieldNames } };
  }

  function countKinds(mapping, originalKinds) {
    const result = { class: 0, type: 0, method: 0, field: 0, param: 0, local: 0, total: 0 };
    Object.keys(mapping).forEach(name => {
      const kind = originalKinds.get(name) || 'local';
      result[kind] = (result[kind] || 0) + 1;
      result.total++;
    });
    return result;
  }

  function applyMappingToTokens(code, mapping, options, mappingKinds) {
    const opts = mergeOptions(options);
    const tokens = tokenize(code);
    const ctx = buildStatementContext(tokens);

    return tokens.map((t, index) => {
      if (t.type === 'identifier' && Object.prototype.hasOwnProperty.call(mapping, t.value)) {
        const kind = mappingKinds && mappingKinds[t.value];

        // Never replace package declaration segments. Otherwise a parameter named `model`
        // would corrupt `package ...model...`.
        if (isInsideSet(ctx.packageIndices, index)) return t.value;

        // In import statements replace only the actual imported class/type name, not package segments.
        if (isInsideSet(ctx.importIndices, index)) {
          if (isInsideSet(ctx.importLeafIndices, index) && (kind === 'class' || kind === 'type')) return mapping[t.value];
          return t.value;
        }

        return mapping[t.value];
      }
      if ((t.type === 'comment' && opts.obfuscateInsideComments) || (t.type === 'string' && opts.obfuscateInsideStrings)) {
        return replaceWords(t.value, mapping);
      }
      return t.value;
    }).join('');
  }

  function replaceWords(text, mapping) {
    let output = text;
    const keys = Object.keys(mapping).sort((a, b) => b.length - a.length);
    for (const key of keys) {
      const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      output = output.replace(new RegExp(`\\b${escaped}\\b`, 'g'), mapping[key]);
    }
    return output;
  }

  function invertMapping(mapping) {
    const inverted = {};
    for (const [k, v] of Object.entries(mapping || {})) inverted[v] = k;
    return inverted;
  }

  function obfuscate(code, options) {
    const opts = mergeOptions(options);
    const collected = collectMappings(code, opts);
    const obfuscatedCode = applyMappingToTokens(code, collected.mapping, opts, collected.kinds);
    return {
      originalCode: code,
      obfuscatedCode,
      mapping: collected.mapping,
      reverseMapping: invertMapping(collected.mapping),
      mappingKinds: collected.kinds,
      stats: collected.stats,
      createdAt: new Date().toISOString(),
      version: '1.0.0'
    };
  }

  function deobfuscate(text, reverseMappingOrSession) {
    const reverse = reverseMappingOrSession && reverseMappingOrSession.reverseMapping
      ? reverseMappingOrSession.reverseMapping
      : reverseMappingOrSession;
    if (!reverse || typeof reverse !== 'object') return text;
    return replaceWords(text, reverse);
  }

  function validateMapping(mapping) {
    const values = Object.values(mapping || {});
    return values.length === new Set(values).size;
  }

  return {
    tokenize,
    obfuscate,
    deobfuscate,
    invertMapping,
    validateMapping,
    DEFAULT_OPTIONS
  };
});
