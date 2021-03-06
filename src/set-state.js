import sketch from 'sketch/dom'
import settings from 'sketch/settings'
import * as UI from './ui.js'
import {
  getSymbol,
  getStates,
  getValueForOverride,
  analytics
} from './utils.js'

var doc = sketch.getSelectedDocument(),
  selection = doc.selectedLayers

export default context => {
  try {
    let symbol = getSymbol(selection),
      states = getStates(symbol, true),
      result = setStateDialog(states.map(state => state.name))
    if (result && (states[result.index])) {
      let stateName = states[result.index].name,
        stateOverrides = states[result.index].overrides,
        value, errors = []
      stateOverrides.map(stateOverride => {
        symbol.overrides.map(symbolOverride => {
          if (symbolOverride.editable &&
            symbolOverride.property != "image" &&
            stateOverride.id == symbolOverride.id) {
            try {
              value = getValueForOverride(doc, symbol, stateOverride)
            } catch (e) {
              errors.push(symbolOverride)
            }
            symbol.setOverrideValue(symbolOverride, (value) ? value : "")
          }
        })
      })
      if (errors.length > 0) {
        analytics("State Errors", errors.length / stateOverrides.length)
        return errorDialog(symbol, stateName, errors)
      }
      analytics("State Set", 1)
      return UI.success(stateName + " state set.")
    }

  } catch (e) {
    console.log(e)
    context.document.reloadInspector()
    return e
  }
}

const setStateDialog = items => {
  let buttons = ['Set', 'Cancel'],
    info = "Please select a symbol state.",
    accessory = UI.popUpButton(items),
    response = UI.dialog(info, accessory, buttons),
    result = {
      index: accessory.indexOfSelectedItem(),
      title: accessory.titleOfSelectedItem()
    }
  if (response === 1000) {
    return result
  }
}

const errorDialog = (symbol, stateName, overrides) => {
  let info = stateName + " has errors. Some overrides could not be found:",
    items = getErrorList(symbol, overrides),
    list = UI.errorList(items),
    accessory = UI.scrollView(list)

  UI.dialog(info, accessory)
}

const getErrorList = (symbol, overrides) => {
  var properties = {
    "textStyle": "Text Style",
    "layerStyle": "Layer Style",
    "symbolID": "Symbol",
    "stringValue": "Text"
  }
  return overrides.map(override => {
    let layers = override.path.split("/"),
      error = []
    layers.map((layer, i) => {
      error.push(symbol.overrides.find(symbolOverride => {
        return symbolOverride.path == layers.slice(0, i + 1).join("/")
      }).affectedLayer.name)
    })
    let path = error.join(" > ")
    if (path.length > 36) {
      path = path.slice(0,16) + " ... " + path.slice(-16)
    }
    return properties[override.property] + ":  " + path
  })
}
