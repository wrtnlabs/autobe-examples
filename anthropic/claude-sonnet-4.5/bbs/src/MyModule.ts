import { Module } from "@nestjs/common";

import { AuthGuestController } from "./controllers/auth/guest/AuthGuestController";
import { AuthMemberController } from "./controllers/auth/member/AuthMemberController";
import { AuthModeratorController } from "./controllers/auth/moderator/AuthModeratorController";
import { AuthAdministratorController } from "./controllers/auth/administrator/AuthAdministratorController";
import { AuthAdministratorPasswordResetRequestController } from "./controllers/auth/administrator/password/reset/request/AuthAdministratorPasswordResetRequestController";
import { AuthAdministratorPasswordResetCompleteController } from "./controllers/auth/administrator/password/reset/complete/AuthAdministratorPasswordResetCompleteController";
import { AuthAdministratorPasswordChangeController } from "./controllers/auth/administrator/password/change/AuthAdministratorPasswordChangeController";
import { DiscussionboardCategoriesController } from "./controllers/discussionBoard/categories/DiscussionboardCategoriesController";
import { DiscussionboardAdministratorCategoriesController } from "./controllers/discussionBoard/administrator/categories/DiscussionboardAdministratorCategoriesController";
import { DiscussionboardUsersController } from "./controllers/discussionBoard/users/DiscussionboardUsersController";
import { DiscussionboardMemberUsersController } from "./controllers/discussionBoard/member/users/DiscussionboardMemberUsersController";
import { DiscussionboardAdministratorUsersController } from "./controllers/discussionBoard/administrator/users/DiscussionboardAdministratorUsersController";
import { DiscussionboardMemberUsersSessionsController } from "./controllers/discussionBoard/member/users/sessions/DiscussionboardMemberUsersSessionsController";
import { DiscussionboardAdministratorUsersSessionsController } from "./controllers/discussionBoard/administrator/users/sessions/DiscussionboardAdministratorUsersSessionsController";
import { DiscussionboardMemberUsersLoginhistoryController } from "./controllers/discussionBoard/member/users/loginHistory/DiscussionboardMemberUsersLoginhistoryController";
import { DiscussionboardMemberUsersBlockedusersController } from "./controllers/discussionBoard/member/users/blockedUsers/DiscussionboardMemberUsersBlockedusersController";
import { DiscussionboardUsersReputationController } from "./controllers/discussionBoard/users/reputation/DiscussionboardUsersReputationController";
import { DiscussionboardMemberBlockedusersController } from "./controllers/discussionBoard/member/blockedUsers/DiscussionboardMemberBlockedusersController";
import { DiscussionboardMemberUsersFavoritesController } from "./controllers/discussionBoard/member/users/favorites/DiscussionboardMemberUsersFavoritesController";
import { DiscussionboardMemberUsersFollowedtagsController } from "./controllers/discussionBoard/member/users/followedTags/DiscussionboardMemberUsersFollowedtagsController";
import { DiscussionboardMemberUsersWatchedtopicsController } from "./controllers/discussionBoard/member/users/watchedTopics/DiscussionboardMemberUsersWatchedtopicsController";
import { DiscussionboardMemberUsersNotificationpreferencesController } from "./controllers/discussionBoard/member/users/notificationPreferences/DiscussionboardMemberUsersNotificationpreferencesController";
import { DiscussionboardMemberUsersNotificationsController } from "./controllers/discussionBoard/member/users/notifications/DiscussionboardMemberUsersNotificationsController";
import { DiscussionboardTopicsController } from "./controllers/discussionBoard/topics/DiscussionboardTopicsController";
import { DiscussionboardMemberTopicsController } from "./controllers/discussionBoard/member/topics/DiscussionboardMemberTopicsController";
import { DiscussionboardTopicsRepliesController } from "./controllers/discussionBoard/topics/replies/DiscussionboardTopicsRepliesController";
import { DiscussionboardMemberTopicsRepliesController } from "./controllers/discussionBoard/member/topics/replies/DiscussionboardMemberTopicsRepliesController";
import { DiscussionboardTagsController } from "./controllers/discussionBoard/tags/DiscussionboardTagsController";
import { DiscussionboardModeratorTagsController } from "./controllers/discussionBoard/moderator/tags/DiscussionboardModeratorTagsController";
import { DiscussionboardAdministratorTagsController } from "./controllers/discussionBoard/administrator/tags/DiscussionboardAdministratorTagsController";
import { DiscussionboardTagsStatisticsController } from "./controllers/discussionBoard/tags/statistics/DiscussionboardTagsStatisticsController";
import { DiscussionboardMemberVotesController } from "./controllers/discussionBoard/member/votes/DiscussionboardMemberVotesController";
import { DiscussionboardModeratorReportsController } from "./controllers/discussionBoard/moderator/reports/DiscussionboardModeratorReportsController";
import { DiscussionboardAdministratorReportsController } from "./controllers/discussionBoard/administrator/reports/DiscussionboardAdministratorReportsController";
import { DiscussionboardReportsController } from "./controllers/discussionBoard/reports/DiscussionboardReportsController";
import { DiscussionboardMemberReportsController } from "./controllers/discussionBoard/member/reports/DiscussionboardMemberReportsController";
import { DiscussionboardModeratorModerationactionsController } from "./controllers/discussionBoard/moderator/moderationActions/DiscussionboardModeratorModerationactionsController";
import { DiscussionboardAdministratorModerationactionsController } from "./controllers/discussionBoard/administrator/moderationActions/DiscussionboardAdministratorModerationactionsController";
import { DiscussionboardAdministratorWarningsController } from "./controllers/discussionBoard/administrator/warnings/DiscussionboardAdministratorWarningsController";
import { DiscussionboardModeratorWarningsController } from "./controllers/discussionBoard/moderator/warnings/DiscussionboardModeratorWarningsController";
import { DiscussionboardModeratorSuspensionsController } from "./controllers/discussionBoard/moderator/suspensions/DiscussionboardModeratorSuspensionsController";
import { DiscussionboardAdministratorSuspensionsController } from "./controllers/discussionBoard/administrator/suspensions/DiscussionboardAdministratorSuspensionsController";
import { DiscussionboardAdministratorBansController } from "./controllers/discussionBoard/administrator/bans/DiscussionboardAdministratorBansController";
import { DiscussionboardMemberAppealsController } from "./controllers/discussionBoard/member/appeals/DiscussionboardMemberAppealsController";
import { DiscussionboardAdministratorAppealsController } from "./controllers/discussionBoard/administrator/appeals/DiscussionboardAdministratorAppealsController";
import { DiscussionboardAdministratorAuditLogsController } from "./controllers/discussionBoard/administrator/audit/logs/DiscussionboardAdministratorAuditLogsController";
import { DiscussionboardAdministratorAuditSecurityController } from "./controllers/discussionBoard/administrator/audit/security/DiscussionboardAdministratorAuditSecurityController";
import { DiscussionboardAdministratorAuditModerationController } from "./controllers/discussionBoard/administrator/audit/moderation/DiscussionboardAdministratorAuditModerationController";
import { DiscussionboardAdministratorAuditSearchesController } from "./controllers/discussionBoard/administrator/audit/searches/DiscussionboardAdministratorAuditSearchesController";

@Module({
  controllers: [
    AuthGuestController,
    AuthMemberController,
    AuthModeratorController,
    AuthAdministratorController,
    AuthAdministratorPasswordResetRequestController,
    AuthAdministratorPasswordResetCompleteController,
    AuthAdministratorPasswordChangeController,
    DiscussionboardCategoriesController,
    DiscussionboardAdministratorCategoriesController,
    DiscussionboardUsersController,
    DiscussionboardMemberUsersController,
    DiscussionboardAdministratorUsersController,
    DiscussionboardMemberUsersSessionsController,
    DiscussionboardAdministratorUsersSessionsController,
    DiscussionboardMemberUsersLoginhistoryController,
    DiscussionboardMemberUsersBlockedusersController,
    DiscussionboardUsersReputationController,
    DiscussionboardMemberBlockedusersController,
    DiscussionboardMemberUsersFavoritesController,
    DiscussionboardMemberUsersFollowedtagsController,
    DiscussionboardMemberUsersWatchedtopicsController,
    DiscussionboardMemberUsersNotificationpreferencesController,
    DiscussionboardMemberUsersNotificationsController,
    DiscussionboardTopicsController,
    DiscussionboardMemberTopicsController,
    DiscussionboardTopicsRepliesController,
    DiscussionboardMemberTopicsRepliesController,
    DiscussionboardTagsController,
    DiscussionboardModeratorTagsController,
    DiscussionboardAdministratorTagsController,
    DiscussionboardTagsStatisticsController,
    DiscussionboardMemberVotesController,
    DiscussionboardModeratorReportsController,
    DiscussionboardAdministratorReportsController,
    DiscussionboardReportsController,
    DiscussionboardMemberReportsController,
    DiscussionboardModeratorModerationactionsController,
    DiscussionboardAdministratorModerationactionsController,
    DiscussionboardAdministratorWarningsController,
    DiscussionboardModeratorWarningsController,
    DiscussionboardModeratorSuspensionsController,
    DiscussionboardAdministratorSuspensionsController,
    DiscussionboardAdministratorBansController,
    DiscussionboardMemberAppealsController,
    DiscussionboardAdministratorAppealsController,
    DiscussionboardAdministratorAuditLogsController,
    DiscussionboardAdministratorAuditSecurityController,
    DiscussionboardAdministratorAuditModerationController,
    DiscussionboardAdministratorAuditSearchesController,
  ],
})
export class MyModule {}
