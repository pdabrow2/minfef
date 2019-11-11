(function setup(){
    var applicationState = {};
    window.getApplicationState = function () {
        return applicationState;
    }
    function getRef(state, path) {
        if(typeof(path) === 'undefined' || path.length === 0)
            return state;
        if(path.indexOf('.') >= 0) {
            var parts = path.split('.');
            var ref = state;
            for(var i = 0; i < parts.length; i++)
            {
                if(typeof(ref[parts[i]]) === 'undefined')
                    ref = ref[parts[i]] = {};
                else
                    ref = ref[parts[i]];
            }
            return ref;
        }
        else if(path.length > 0)
        {
            var ref = state[path];
            if(typeof(ref) === 'undefined')
            {
                state[path] = {};
                ref = state[path];
            }
            return ref;
        }
    }
    function getDir(modelPath) {
        if(modelPath.indexOf('.') > 0)
            return modelPath.split('.').slice(0, -1).join('.');
        return '';
    }
    function getName(modelPath) {
        if(modelPath.indexOf('.') > 0)
            return modelPath.split('.').splice(-1)[0];
        return modelPath;
    }
    window.setModel = function(modelPath, value, publishChanges)
    {
        publishChanges = typeof(publishChanges) === 'undefined' ? true : false;
        if(!modelPath || modelPath.length === 0)
            applicationState = value;
        else
        {
            var modelDir = getDir(modelPath);
            var modelName = getName(modelPath);
            getRef(applicationState, modelDir)[modelName] = value;
        }
        if(publishChanges)
            pushStateModelToDom(modelPath);
        //console.log('setModel', applicationState);
    }
    window.getValue = function(modelPath)
    {
        var modelDir = getDir(modelPath);
        var modelName = getName(modelPath);
        var ret = getRef(applicationState, modelDir)[modelName];
        if(typeof(ret) === 'undefined')
            ret = '';
        return ret;
    }
    var registeredActions = {};
    window.registerAction = function(actionName, method) {   
        if(typeof(registeredActions[actionName]) === 'undefined')
            registeredActions[actionName] = method;
    };
    window.publish = function(actionName, modelPath, payload) {
        if(typeof(modelPath) === 'undefined')
            modelPath = '';
        if(typeof(registeredActions[actionName]) === 'function')
            registeredActions[actionName](modelPath, payload);
        //console.log('publish', applicationState);
        pushStateModelToDom(modelPath);
    }
    // data-model
    // find and update whenever state changes
    var subscribersModelToDom = {};
    (function connectModelToDom() {
        var boundElements = document.querySelectorAll('[data-model]');
        if(boundElements && boundElements.length > 0)
        {
            for(var i = 0; i < boundElements.length; i++)
            {
                var domElement = boundElements[i];
                var modelPath = domElement.attributes['data-model'].value;
                setModel(modelPath, domElement.attributes['value'].value, false);
                var ref = getRef(subscribersModelToDom, modelPath);
                if(typeof(ref['subscribers']) === 'undefined')
                    ref['subscribers'] = [];
                ref.subscribers.push({type: 'model', element: domElement});
                // to-way binding
                if(typeof(ref['eventListeners']) === 'undefined')
                    ref['eventListeners'] = [];
                var onInputEventListener = function(_modelPath, _element) 
                { 
                    setModel(_modelPath, _element.value); 
                }.bind(null, modelPath, domElement);
                // keeping a register for all event handlers
                // this could be used to implement unbinding of an element
                ref['eventListeners'].push(onInputEventListener);
                domElement.addEventListener('input', onInputEventListener);
            }
        }
    }());

    function evaluateIf(domElement) {
        with(applicationState) {
            return eval('var ret = false; try { ret = ' + domElement.attributes['data-if'].value + '; } catch {}; ret;');
        }
    }

    function processIf(domElement) {
        if(evaluateIf(domElement))
            domElement.classList.remove('hidden');
        else
            domElement.classList.add('hidden');
    }

    (function connectIfToDom() {
        function getModelPathsFromCondition(conditionText) {
            return conditionText.split(/[ ><=&|(){}]+/).filter(function(p) { return !Number.isInteger(1 * p) && !p.startsWith('"') && !p.startsWith("'"); });
        }

        var domElementsWithIf = document.querySelectorAll('[data-if]');
        if(domElementsWithIf && domElementsWithIf.length > 0)
        {
            for(var i = 0; i < domElementsWithIf.length; i++)
            {
                var domElement = domElementsWithIf[i];
                var dependentOnModelPaths = getModelPathsFromCondition(domElement.attributes['data-if'].value);
                for(var j = 0; j < dependentOnModelPaths.length; j++)
                {
                    var modelPath = dependentOnModelPaths[j];
                    var ref = getRef(subscribersModelToDom, modelPath);
                    if(typeof(ref['subscribers']) === 'undefined')
                        ref['subscribers'] = [];
                    ref.subscribers.push({type: 'if', element: domElement});
                    processIf(domElement);
                }
            }
        }
    }());
    
    function evaluateHtml(domElement) {
        with(applicationState) {
            return eval('var ret = false; try { ret = ' + domElement.attributes['data-html'].value + '; } catch {}; ret;');
        }
    }

    function processHtml(domElement) {
        domElement.innerHTML = evaluateHtml(domElement);
    }

    (function connectHtmlToDom() {
        var domElementsWithHtml = document.querySelectorAll('[data-html]');
        if(domElementsWithHtml && domElementsWithHtml.length > 0)
        {
            for(var i = 0; i < domElementsWithHtml.length; i++)
            {
                var domElement = domElementsWithHtml[i];
                var modelPath = domElement.attributes['data-html'].value;
                var ref = getRef(subscribersModelToDom, modelPath);
                if(typeof(ref['subscribers']) === 'undefined')
                    ref['subscribers'] = [];
                ref.subscribers.push({type: 'html', element: domElement});
                processHtml(domElement);
            }
        }
    }());

    window.pushStateModelToDom = function(modelPath) {
        var ref = getRef(subscribersModelToDom, modelPath);
        if(ref && ref.subscribers && ref.subscribers.length > 0)
            for(var i = 0; i < ref.subscribers.length; i++)
            {
                var subscription = ref.subscribers[i];
                switch(subscription.type) {
                    case 'model':
                        subscription.element.value = getValue(modelPath);
                        break;
                    case 'if':
                        processIf(subscription.element);
                        break;
                    case 'html':
                        processHtml(subscription.element);
                        break;
                }
            }
        var keys = Object.keys(ref);
        for(var j = 0; j < keys.length; j++)
        {
            if(keys[j] === 'subscribers' || keys[j].length === 0)
                continue;
            if(modelPath.length > 0)
                pushStateModelToDom(modelPath + '.' + keys[j]);
            else
                pushStateModelToDom(keys[j]);
        }
    };
    window.apply = function() {
        pushStateModelToDom('');
    }
}());
