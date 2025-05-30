import * as sdk from 'botpress/sdk'
import { lang, utils } from 'botpress/shared'
import cx from 'classnames'
import React, { FC, Fragment, useEffect, useRef, useState } from 'react'
import { HotKeys } from 'react-hotkeys'
import { connect } from 'react-redux'
import { Redirect, Route, Switch } from 'react-router-dom'
import SplitPane from 'react-split-pane'
import { setEmulatorOpen, toggleBottomPanel, toggleInspector, viewModeChanged } from '~/actions'
import SelectContentManager from '~/components/Content/Select/Manager'
import PluginInjectionSite from '~/components/PluginInjectionSite'
import Config from '~/views/Config'
import Content from '~/views/Content'
import FlowBuilder from '~/views/FlowBuilder'
import Libraries from '~/views/Libraries'
import Module from '~/views/Module'
import NLU from '~/views/Nlu'
import QNA from '~/views/Qna'

import BottomPanel from './BottomPanel'
import BotUmountedWarning from './BotUnmountedWarning'
import CommandPalette from './CommandPalette'
import GuidedTour from './GuidedTour'
import LanguageServerHealth from './LangServerHealthWarning'
import layout from './Layout.scss'
import Sidebar from './Sidebar'
import StatusBar from './StatusBar'
import Toolbar from './Toolbar'

const { isInputFocused } = utils
const WEBCHAT_PANEL_STATUS = 'bp::webchatOpened'

interface OwnProps {
  location: any
  history: any
  setEmulatorOpen: (state: boolean) => void
}

type StateProps = ReturnType<typeof mapStateToProps>
type DispatchProps = typeof mapDispatchToProps

type Props = DispatchProps & StateProps & OwnProps

const bottomPanelSizeKey = `bp::${window.BOT_ID}::bottom-panel-size`
const bottomPanelDefaultSize = 175
const topPanelMinSize = 200
const bottomPanelMinSize = 100

const Layout: FC<Props> = (props: Props) => {
  const mainElRef = useRef(null)
  const [langSwitcherOpen, setLangSwitcherOpen] = useState(false)
  const [guidedTourOpen, setGuidedTourOpen] = useState(false)

  useEffect(() => {
    const viewMode = props.location.query && props.location.query.viewMode

    setImmediate(() => {
      props.viewModeChanged(Number(viewMode) || 0)
    })

    setTimeout(() => BotUmountedWarning(), 500)

    const handleWebChatPanel = (message) => {
      if (message.data.chatId) {
        return // event is not coming from emulator
      }

      if (message.data.name === 'webchatLoaded' && utils.storage.get(WEBCHAT_PANEL_STATUS) !== 'closed') {
        toggleEmulator()
      }

      if (message.data.name === 'webchatOpened') {
        utils.storage.set(WEBCHAT_PANEL_STATUS, 'opened')
        props.setEmulatorOpen(true)
      }

      if (message.data.name === 'webchatClosed') {
        utils.storage.set(WEBCHAT_PANEL_STATUS, 'closed')
        props.setEmulatorOpen(false)
      }
    }
    window.addEventListener('message', handleWebChatPanel)

    return () => {
      window.removeEventListener('message', handleWebChatPanel)
    }
  }, [])

  useEffect(() => {
    if (props.translations) {
      lang.extend(props.translations)
      lang.init()
    }
  }, [props.translations])

  const toggleEmulator = () => {
    window.botpressWebChat.sendEvent({ type: 'toggle' })
  }

  const toggleGuidedTour = () => {
    setGuidedTourOpen(!guidedTourOpen)
  }

  const focusEmulator = (e) => {
    if (!isInputFocused() || e.ctrlKey) {
      e.preventDefault()
      window.botpressWebChat.sendEvent({ type: 'show' })
    }
  }

  const closeEmulator = (e) => {
    window.botpressWebChat.sendEvent({ type: 'hide' })
  }

  const toggleDocs = (e) => {
    e.preventDefault()

    if (props.docHints.length) {
      window.open(`https://botpress.com/docs/${props.docHints[0]}`, '_blank')
    }
  }

  const toggleLangSwitcher = (e) => {
    e && e.preventDefault()
    if (!isInputFocused()) {
      setLangSwitcherOpen(() => {
        // lang switcher just closed
        if (!langSwitcherOpen) {
          focusMain()
        }
        return !langSwitcherOpen
      })
    }
  }

  const focusMain = () => {
    if (mainElRef?.current) {
      mainElRef.current.focus()
    }
  }

  const gotoUrl = (url) => {
    if (!isInputFocused()) {
      props.history.push(url)
      focusMain()
    }
  }

  const toggleBottomPanel = (e) => {
    e.preventDefault()
    props.toggleBottomPanel()
  }

  const goHome = () => {
    if (!isInputFocused()) {
      window.location.href = `${window.ROOT_PATH}/admin`
    }
  }

  if (props.viewMode < 0 || !props.translations) {
    return null
  }

  const keyHandlers = {
    'emulator-focus': focusEmulator,
    cancel: closeEmulator,
    'docs-toggle': toggleDocs,
    'bottom-bar': toggleBottomPanel,
    'lang-switcher': toggleLangSwitcher,
    'go-flow': () => gotoUrl('/flows'),
    'go-home': goHome,
    'go-content': () => gotoUrl('/content'),
    // 'go-module-code': () => gotoUrl('/modules/code-editor'),
    'go-module-qna': () => gotoUrl('/modules/qna'),
    'go-module-testing': () => gotoUrl('/modules/testing'),
    'go-module-analytics': () => gotoUrl('/modules/analytics'),
    'go-understanding': () => gotoUrl('/nlu'),
    'toggle-inspect': props.toggleInspector
  }

  const bottomPanelSize = parseInt(localStorage.getItem(bottomPanelSizeKey) || bottomPanelDefaultSize.toString(), 10)
  return (
    <Fragment>
      <HotKeys handlers={keyHandlers} id="mainLayout" className={layout.mainLayout}>
        <Sidebar />
        <div className={layout.container}>
          <Toolbar
            hasDoc={props.docHints?.length}
            toggleDocs={toggleDocs}
            toggleGuidedTour={toggleGuidedTour}
            onToggleEmulator={toggleEmulator}
            toggleBottomPanel={props.toggleBottomPanel}
          />
          <SplitPane
            split={'horizontal'}
            defaultSize={bottomPanelDefaultSize}
            onChange={(size) => localStorage.setItem(bottomPanelSizeKey, size.toString())}
            size={props.bottomPanel ? bottomPanelSize : '100%'}
            maxSize={-topPanelMinSize}
            minSize={props.bottomPanel ? bottomPanelMinSize : undefined}
            allowResize={props.bottomPanel}
            primary={props.bottomPanel ? 'second' : 'first'}
            className={cx(layout.mainSplitPaneWToolbar, {
              'emulator-open': props.emulatorOpen
            })}
          >
            <main ref={mainElRef} className={layout.main} id="main" tabIndex={9999}>
              <Switch>
                <Route
                  exact
                  path="/"
                  render={() => {
                    return window.IS_BOT_MOUNTED ? <Redirect to="/flows" /> : <Redirect to="/config" />
                  }}
                />
                {/* <Route exact path="/libraries" component={Libraries} /> */}
                <Route exact path="/content" component={Content} />
                <Route exact path="/flows/:flow*" component={FlowBuilder} />
                <Route exact path="/config" component={Config} />
                <Route exact path="/nlu" component={NLU} />
                <Route exact path="/qna" component={QNA} />

                <Route exact path="/modules/:moduleName/:componentName?" render={(props) => <Module {...props} />} />
              </Switch>
            </main>
            <BottomPanel />
          </SplitPane>

          <PluginInjectionSite site="overlay" />
          <SelectContentManager />
          <GuidedTour isDisplayed={guidedTourOpen} onToggle={toggleGuidedTour} />
          <LanguageServerHealth />
        </div>
      </HotKeys>
      <StatusBar
        onToggleEmulator={toggleEmulator}
        langSwitcherOpen={langSwitcherOpen}
        toggleLangSwitcher={toggleLangSwitcher}
        onToggleGuidedTour={toggleGuidedTour}
        toggleBottomPanel={props.toggleBottomPanel}
      />
      <CommandPalette toggleEmulator={toggleEmulator} />
    </Fragment>
  )
}

const mapStateToProps = (state) => ({
  viewMode: state.ui.viewMode,
  docHints: state.ui.docHints,
  bottomPanel: state.ui.bottomPanel,
  bottomPanelExpanded: state.ui.bottomPanelExpanded,
  translations: state.language.translations,
  contentLang: state.language.contentLang,
  emulatorOpen: state.ui.emulatorOpen
})

const mapDispatchToProps = {
  viewModeChanged,
  toggleBottomPanel,
  setEmulatorOpen,
  toggleInspector
}

export default connect(mapStateToProps, mapDispatchToProps)(Layout)
