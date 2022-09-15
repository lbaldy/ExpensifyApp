/* eslint-disable @lwc/lwc/no-async-await */
import React from 'react';
import Onyx from 'react-native-onyx';
import {Linking, AppState} from 'react-native';
import {fireEvent, render, act} from '@testing-library/react-native';
import lodashGet from 'lodash/get';
import moment from 'moment';
import App from '../../src/App';
import CONST from '../../src/CONST';
import ONYXKEYS from '../../src/ONYXKEYS';
import waitForPromisesToResolve from '../utils/waitForPromisesToResolve';
import * as TestHelper from '../utils/TestHelper';
import appSetup from '../../src/setup';
import fontWeightBold from '../../src/styles/fontWeight/bold';
import * as AppActions from '../../src/libs/actions/App';
import * as NumberUtils from '../../src/libs/NumberUtils';
import LocalNotification from '../../src/libs/Notification/LocalNotification';
import * as Report from '../../src/libs/actions/Report';

beforeAll(() => {
    // In this test, we are generically mocking the responses of all API requests by mocking fetch() and having it
    // return 200. In other tests, we might mock HttpUtils.xhr() with a more specific mock data response (which means
    // fetch() never gets called so it does not need mocking) or we might have fetch throw an error to test error handling
    // behavior. But here we just want to treat all API requests as a generic "success" and in the cases where we need to
    // simulate data arriving we will just set it into Onyx directly with Onyx.merge() or Onyx.set() etc.
    global.fetch = TestHelper.getGlobalFetchMock();

    // We need a bit more time for this test in some places
    Linking.setInitialURL('https://new.expensify.com/r/1');
    appSetup();
});

/**
 * @param {RenderAPI} renderedApp
 */
function scrollUpToRevealNewMessagesBadge(renderedApp) {
    fireEvent.scroll(renderedApp.getByA11yLabel('List of chat messages'), {
        nativeEvent: {
            contentOffset: {
                y: 250,
            },
            contentSize: {
                // Dimensions of the scrollable content
                height: 500,
                width: 100,
            },
            layoutMeasurement: {
                // Dimensions of the device
                height: 700,
                width: 300,
            },
        },
    });

    // We advance the timer since we must wait for the animation to end
    // and the new style to be reflected
    jest.advanceTimersByTime(100);
}

/**
 * @param {RenderAPI} renderedApp
 * @return {Boolean}
 */
function isNewMessagesBadgeVisible(renderedApp) {
    const badge = renderedApp.getByA11yHint('Scroll to newest messages');
    return badge.props.style.transform[0].translateY === 10;
}

/**
 * @param {RenderAPI} renderedApp
 * @return {Promise}
 */
async function navigateToSidebar(renderedApp) {
    const reportHeaderBackButton = renderedApp.getByA11yHint('Navigate back to chats list');
    fireEvent(reportHeaderBackButton, 'press');
    return waitForPromisesToResolve();
}

/**
 * @param {RenderAPI} renderedApp
 * @param {Number} index
 * @return {Promise}
 */
function navigateToSidebarOption(renderedApp, index) {
    const optionRows = renderedApp.getAllByA11yHint('Navigates to a chat');
    fireEvent(optionRows[index], 'press');
    return waitForPromisesToResolve();
}

/**
 * @param {RenderAPI} renderedApp
 * @return {Boolean}
 */
function isDrawerOpen(renderedApp) {
    const sidebarLinks = renderedApp.queryAllByA11yLabel('List of chats');
    return !lodashGet(sidebarLinks, [0, 'props', 'accessibilityElementsHidden']);
}

const REPORT_ID = 1;
const USER_A_ACCOUNT_ID = 1;
const USER_A_EMAIL = 'user_a@test.com';
const USER_B_ACCOUNT_ID = 2;
const USER_B_EMAIL = 'user_b@test.com';
const USER_C_ACCOUNT_ID = 3;
const USER_C_EMAIL = 'user_c@test.com';

/**
 * @returns {RenderAPI}
 */
async function signInAndGetAppWithUnreadChat() {
    // Render the App and sign in as a test user.
    const renderedApp = render(<App />);

    // Note: act() is necessary since react-navigation's NavigationContainer has an internal state update that will throw some
    // warnings related to async code. See: https://callstack.github.io/react-native-testing-library/docs/understanding-act/#asynchronous-act
    await act(async () => {
        await waitForPromisesToResolve();
    });

    const loginForm = renderedApp.queryAllByA11yLabel('Login form');
    expect(loginForm.length).toBe(1);

    await TestHelper.signInWithTestUser(USER_A_ACCOUNT_ID, USER_A_EMAIL, undefined, undefined, 'A');

    const MOMENT_TEN_MINUTES_AGO = moment().subtract(10, 'minutes');

    // Simulate setting an unread report and personal details
    Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}${REPORT_ID}`, {
        reportID: REPORT_ID,
        reportName: 'Chat Report',
        maxSequenceNumber: 9,
        lastReadSequenceNumber: 1,
        lastMessageTimestamp: MOMENT_TEN_MINUTES_AGO.utc(),
        lastMessageText: 'Test',
        participants: [USER_B_EMAIL],
    });
    Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${REPORT_ID}`, {
        0: {
            actionName: CONST.REPORT.ACTIONS.TYPE.CREATED,
            automatic: false,
            sequenceNumber: 0,
            timestamp: MOMENT_TEN_MINUTES_AGO.unix(),
            reportActionID: NumberUtils.rand64(),
        },
        1: TestHelper.buildTestReportComment(USER_B_EMAIL, 1, MOMENT_TEN_MINUTES_AGO.add(10, 'seconds').unix()),
        2: TestHelper.buildTestReportComment(USER_B_EMAIL, 2, MOMENT_TEN_MINUTES_AGO.add(20, 'seconds').unix()),
        3: TestHelper.buildTestReportComment(USER_B_EMAIL, 3, MOMENT_TEN_MINUTES_AGO.add(30, 'seconds').unix()),
        4: TestHelper.buildTestReportComment(USER_B_EMAIL, 4, MOMENT_TEN_MINUTES_AGO.add(40, 'seconds').unix()),
        5: TestHelper.buildTestReportComment(USER_B_EMAIL, 5, MOMENT_TEN_MINUTES_AGO.add(50, 'seconds').unix()),
        6: TestHelper.buildTestReportComment(USER_B_EMAIL, 6, MOMENT_TEN_MINUTES_AGO.add(60, 'seconds').unix()),
        7: TestHelper.buildTestReportComment(USER_B_EMAIL, 7, MOMENT_TEN_MINUTES_AGO.add(70, 'seconds').unix()),
        8: TestHelper.buildTestReportComment(USER_B_EMAIL, 8, MOMENT_TEN_MINUTES_AGO.add(80, 'seconds').unix()),
        9: TestHelper.buildTestReportComment(USER_B_EMAIL, 9, MOMENT_TEN_MINUTES_AGO.add(90, 'seconds').unix()),
    });
    Onyx.merge(ONYXKEYS.PERSONAL_DETAILS, {
        [USER_B_EMAIL]: TestHelper.buildPersonalDetails(USER_B_EMAIL, USER_B_ACCOUNT_ID, 'B'),
    });

    // We manually setting the sidebar as loaded since the onLayout event does not fire in tests
    AppActions.setSidebarLoaded(true);
    await waitForPromisesToResolve();
    return renderedApp;
}

describe('Unread Indicators', () => {
    afterEach(Onyx.clear);

    it('Display bold in the LHN for unread chat and new line indicator above the chat message when we navigate to it', async () => {
        const renderedApp = await signInAndGetAppWithUnreadChat();

        // Verify no notifications are created for these older messages
        expect(LocalNotification.showCommentNotification.mock.calls.length).toBe(0);

        // Verify the sidebar links are rendered
        const sidebarLinks = renderedApp.queryAllByA11yLabel('List of chats');
        expect(sidebarLinks.length).toBe(1);
        expect(isDrawerOpen(renderedApp)).toBe(true);

        // Verify there is only one option in the sidebar
        const optionRows = renderedApp.getAllByA11yHint('Navigates to a chat');
        expect(optionRows.length).toBe(1);

        // And that the text is bold
        const displayNameText = renderedApp.getByA11yLabel('Chat user display names');
        expect(lodashGet(displayNameText, ['props', 'style', 0, 'fontWeight'])).toBe(fontWeightBold);

        await navigateToSidebarOption(renderedApp, 0);

        // Verify that the report screen is rendered and the drawer is closed
        expect(isDrawerOpen(renderedApp)).toBe(false);

        // That the report actions are visible along with the created action
        const createdAction = renderedApp.getByA11yLabel('Chat welcome message');
        expect(createdAction).toBeTruthy();
        const reportComments = renderedApp.getAllByA11yLabel('Chat message');
        expect(reportComments.length).toBe(9);

        // Since the last read sequenceNumber is 1 we should have an unread indicator above the next "unread" action which will
        // have a sequenceNumber of 2
        const unreadIndicator = renderedApp.queryAllByA11yLabel('New message line indicator');
        expect(unreadIndicator.length).toBe(1);
        const sequenceNumber = lodashGet(unreadIndicator, [0, 'props', 'data-sequence-number']);
        expect(sequenceNumber).toBe(2);

        // Scroll up and verify that the "New messages" badge appears
        scrollUpToRevealNewMessagesBadge(renderedApp);
        expect(isNewMessagesBadgeVisible(renderedApp)).toBe(true);
    });

    it('Clear the new line indicator and bold when we navigate away from a chat that is now read', async () => {
        const renderedApp = await signInAndGetAppWithUnreadChat();

        // Navigate to the unread chat from the sidebar
        await navigateToSidebarOption(renderedApp, 0);
        expect(isDrawerOpen(renderedApp)).toBe(false);

        // Then navigate back to the sidebar
        await navigateToSidebar(renderedApp);

        // Verify the LHN is now open
        expect(isDrawerOpen(renderedApp)).toBe(true);

        // Verify that the option row in the LHN is no longer bold (since OpenReport marked it as read)
        const updatedDisplayNameText = renderedApp.getByA11yLabel('Chat user display names');
        expect(lodashGet(updatedDisplayNameText, ['props', 'style', 0, 'fontWeight'])).toBe(undefined);

        // Tap on the chat again
        await navigateToSidebarOption(renderedApp, 0);

        // Verify the unread indicator is not present
        const unreadIndicator = renderedApp.queryAllByA11yLabel('New message line indicator');
        expect(unreadIndicator.length).toBe(0);
        expect(isDrawerOpen(renderedApp)).toBe(false);

        // Scroll and verify that the new messages badge is also hidden
        scrollUpToRevealNewMessagesBadge(renderedApp);
        expect(isNewMessagesBadgeVisible(renderedApp)).toBe(false);
    });

    it('Shows a browser notification and bold text when a new message arrives for a chat that is read', async () => {
        const renderedApp = await signInAndGetAppWithUnreadChat();

        // Read the chat by navigating to it then return to the LHN

        // Simulate a new report arriving via Pusher along with reportActions and personalDetails for the other participant
        const NEW_REPORT_ID = 2;
        const NEW_REPORT_CREATED_MOMENT = moment();
        Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}${NEW_REPORT_ID}`, {
            reportID: NEW_REPORT_ID,
            reportName: 'Chat Report',
            maxSequenceNumber: 1,
            lastReadSequenceNumber: 0,
            lastMessageTimestamp: NEW_REPORT_CREATED_MOMENT.utc(),
            lastMessageText: 'Comment 1',
            participants: [USER_C_EMAIL],
        });
        Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${NEW_REPORT_ID}`, {
            0: {
                actionName: CONST.REPORT.ACTIONS.TYPE.CREATED,
                automatic: false,
                sequenceNumber: 0,
                timestamp: NEW_REPORT_CREATED_MOMENT.unix(),
                reportActionID: NumberUtils.rand64(),
            },
            1: {
                actionName: CONST.REPORT.ACTIONS.TYPE.ADDCOMMENT,
                actorEmail: USER_C_EMAIL,
                person: [{type: 'TEXT', style: 'strong', text: 'User C'}],
                sequenceNumber: 1,
                timestamp: NEW_REPORT_CREATED_MOMENT.add(5, 'seconds').unix(),
                message: [{type: 'COMMENT', html: 'Comment 1', text: 'Comment 1'}],
                reportActionID: NumberUtils.rand64(),
            },
        });
        Onyx.merge(ONYXKEYS.PERSONAL_DETAILS, {
            [USER_C_EMAIL]: TestHelper.buildPersonalDetails(USER_C_EMAIL, USER_C_ACCOUNT_ID, 'C'),
        });
        await waitForPromisesToResolve();

        // Verify notification was created as the new message that has arrived is very recent
        expect(LocalNotification.showCommentNotification.mock.calls.length).toBe(1);

        // // Navigate back to the sidebar
        await navigateToSidebar(renderedApp);

        // // Verify the new report option appears in the LHN
        const optionRows = renderedApp.getAllByA11yHint('Navigates to a chat');
        expect(optionRows.length).toBe(2);

        // Verify the text for both chats are bold indicating that nothing has not yet been read
        let displayNameTexts = renderedApp.queryAllByA11yLabel('Chat user display names');
        expect(displayNameTexts.length).toBe(2);
        const firstReportOption = displayNameTexts[0];
        expect(lodashGet(firstReportOption, ['props', 'style', 0, 'fontWeight'])).toBe(fontWeightBold);
        expect(lodashGet(firstReportOption, ['props', 'children'])).toBe('C User');

        const secondReportOption = displayNameTexts[1];
        expect(lodashGet(secondReportOption, ['props', 'style', 0, 'fontWeight'])).toBe(fontWeightBold);
        expect(lodashGet(secondReportOption, ['props', 'children'])).toBe('B User');

        // Tap the new report option and navigate back to the sidebar again via the back button
        await navigateToSidebarOption(renderedApp, 0);

        // Verify that report we navigated to appears in a "read" state while the original unread report still shows as unread
        displayNameTexts = renderedApp.queryAllByA11yLabel('Chat user display names');
        expect(displayNameTexts.length).toBe(2);
        expect(lodashGet(displayNameTexts[0], ['props', 'style', 0, 'fontWeight'])).toBe(undefined);
        expect(lodashGet(displayNameTexts[0], ['props', 'children'])).toBe('C User');
        expect(lodashGet(displayNameTexts[1], ['props', 'style', 0, 'fontWeight'])).toBe(fontWeightBold);
        expect(lodashGet(displayNameTexts[1], ['props', 'children'])).toBe('B User');
    });

    it('Manually marking a chat message as read shows the new line indicator and updates the LHN', async () => {
        const renderedApp = await signInAndGetAppWithUnreadChat();

        // Navigate to the unread report
        await navigateToSidebarOption(renderedApp, 0);

        // It's difficult to trigger marking a report comment as unread since we would have to mock the long press event and then
        // another press on the context menu item so we will do it via the action directly and then test if the UI has updated properly
        Report.markCommentAsUnread(REPORT_ID, 3);
        await waitForPromisesToResolve();

        // Verify the indicator appears above the last action
        let unreadIndicator = renderedApp.queryAllByA11yLabel('New message line indicator');
        expect(unreadIndicator.length).toBe(1);
        const sequenceNumber = lodashGet(unreadIndicator, [0, 'props', 'data-sequence-number']);
        expect(sequenceNumber).toBe(3);

        // Scroll up and verify the new messages badge appears
        scrollUpToRevealNewMessagesBadge(renderedApp);
        expect(isNewMessagesBadgeVisible(renderedApp)).toBe(true);

        // Navigate to the sidebar
        await navigateToSidebar(renderedApp);

        // Verify the report is marked as unread in the sidebar
        let displayNameTexts = renderedApp.queryAllByA11yLabel('Chat user display names');
        expect(displayNameTexts.length).toBe(1);
        expect(lodashGet(displayNameTexts[0], ['props', 'style', 0, 'fontWeight'])).toBe(fontWeightBold);
        expect(lodashGet(displayNameTexts[0], ['props', 'children'])).toBe('B User');

        // Navigate to the report again and back to the sidebar
        await navigateToSidebarOption(renderedApp, 0);
        await navigateToSidebar(renderedApp);

        // Verify the report is now marked as read
        displayNameTexts = renderedApp.queryAllByA11yLabel('Chat user display names');
        expect(displayNameTexts.length).toBe(1);
        expect(lodashGet(displayNameTexts[0], ['props', 'style', 0, 'fontWeight'])).toBe(undefined);
        expect(lodashGet(displayNameTexts[0], ['props', 'children'])).toBe('B User');

        // Navigate to the report again and verify the new line indicator is missing
        await navigateToSidebarOption(renderedApp, 0);
        unreadIndicator = renderedApp.queryAllByA11yLabel('New message line indicator');
        expect(unreadIndicator.length).toBe(0);

        // Scroll up and verify the "New messages" badge is hidden
        scrollUpToRevealNewMessagesBadge(renderedApp);
        expect(isNewMessagesBadgeVisible(renderedApp)).toBe(false);
    });

    it('Removes the new line indicator when a new message is created by the current user', async () => {
        const renderedApp = await signInAndGetAppWithUnreadChat();

        // Verify we are on the LHN and that the chat shows as unread in the LHN
        expect(isDrawerOpen(renderedApp)).toBe(true);

        const displayNameTexts = renderedApp.queryAllByA11yLabel('Chat user display names');
        expect(displayNameTexts.length).toBe(1);
        expect(lodashGet(displayNameTexts[0], ['props', 'children'])).toBe('B User');
        expect(lodashGet(displayNameTexts[0], ['props', 'style', 0, 'fontWeight'])).toBe(fontWeightBold);

        // Navigate to the report and verify the indicator is present
        await navigateToSidebarOption(renderedApp, 0);
        let unreadIndicator = renderedApp.queryAllByA11yLabel('New message line indicator');
        expect(unreadIndicator.length).toBe(1);

        // Leave a comment as the current user and verify the indicator is removed
        Report.addComment(REPORT_ID, 'Current User Comment 1');
        await waitForPromisesToResolve();
        unreadIndicator = renderedApp.queryAllByA11yLabel('New message line indicator');
        expect(unreadIndicator.length).toBe(0);
    });

    it('Clears the new line indicator when the user moves the App to the background', async () => {
        const renderedApp = await signInAndGetAppWithUnreadChat();

        // Verify we are on the LHN and that the chat shows as unread in the LHN
        expect(isDrawerOpen(renderedApp)).toBe(true);

        const displayNameTexts = renderedApp.queryAllByA11yLabel('Chat user display names');
        expect(displayNameTexts.length).toBe(1);
        expect(lodashGet(displayNameTexts[0], ['props', 'children'])).toBe('B User');
        expect(lodashGet(displayNameTexts[0], ['props', 'style', 0, 'fontWeight'])).toBe(fontWeightBold);

        // Navigate to the chat and verify the new line indicator is present
        await navigateToSidebarOption(renderedApp, 0);
        let unreadIndicator = renderedApp.queryAllByA11yLabel('New message line indicator');
        expect(unreadIndicator.length).toBe(1);

        // Then back to the LHN - then back to the chat again and verify the new line indicator has cleared
        await navigateToSidebar(renderedApp);
        await navigateToSidebarOption(renderedApp, 0);
        unreadIndicator = renderedApp.queryAllByA11yLabel('New message line indicator');
        expect(unreadIndicator.length).toBe(0);

        // Mark a previous comment as unread and verify the unread action indicator returns
        Report.markCommentAsUnread(REPORT_ID, 9);
        await waitForPromisesToResolve();
        unreadIndicator = renderedApp.queryAllByA11yLabel('New message line indicator');
        expect(unreadIndicator.length).toBe(1);

        // Trigger the app going inactive and active again
        AppState.emitCurrentTestState('background');
        AppState.emitCurrentTestState('active');

        // Verify the new line is cleared
        unreadIndicator = renderedApp.queryAllByA11yLabel('New message line indicator');
        expect(unreadIndicator.length).toBe(0);
    });
});
