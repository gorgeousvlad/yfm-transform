const evalExp = require('./evaluation');
const {tagLine} = require('./lexical');

const R_LIQUID = /({%-?([\s\S]*?)-?%})/g;

const getElseProp = ({elses}, propName) => elses.length ? elses[0][propName] : undefined;

function inlineConditions(ifTag, vars, content, match, skipErrors) {
    let res = '';

    if (evalExp(ifTag.condition, vars, skipErrors)) {
        res = content.substring(
            ifTag.startPos + ifTag.ifRaw.length,
            getElseProp(ifTag, 'startPos') || match.index
        );
    } else {
        ifTag.elses.some(({conditions, startPos, raw}) => {
            const isTruthy = !conditions || evalExp(conditions, vars, skipErrors);

            if (isTruthy) {
                res = content.substring(startPos + raw.length, match.index);
                return true;
            }

            return false;
        });
    }

    let shift = 0;
    if (res === '' && content[ifTag.startPos - 1] === '\n' && content[R_LIQUID.lastIndex] === '\n') {
        shift = 1;
    }

    const leftPart = content.substring(0, ifTag.startPos) + res.trim();

    return {
        result: leftPart + content.substring(R_LIQUID.lastIndex + shift),
        idx: leftPart.length
    };
}

function conditions(input, vars, skipErrors) {
    let match;
    const tagStack = [];

    while ((match = R_LIQUID.exec(input)) !== null) {
        if (!match[1]) {
            continue;
        }

        const tagMatch = match[2].trim().match(tagLine);
        if (!tagMatch) {
            continue;
        }

        const [type, args] = tagMatch.slice(1);

        switch (type) {
            case 'if':
                tagStack.push({
                    isOpen: true,
                    condition: args,
                    startPos: match.index,
                    ifRaw: match[1],
                    elses: []
                });
                break;
            case 'else':
                tagStack[tagStack.length - 1].elses.push({
                    startPos: match.index,
                    raw: match[1]
                });
                break;
            case 'elsif':
                tagStack[tagStack.length - 1].elses.push({
                    conditions: args,
                    startPos: match.index,
                    raw: match[1]
                });
                break;
            case 'endif': {
                const ifTag = tagStack.pop();
                const tagsInCurrentRow = tagStack.filter(({startRowIdx}) => startRowIdx === ifTag.startRowIdx);

                const {idx, result} = inlineConditions(
                    ifTag, vars, input, match, skipErrors, tagsInCurrentRow.length === 0
                );
                R_LIQUID.lastIndex = idx;
                input = result;

                break;
            }
        }
    }

    return input;
}

module.exports = conditions;