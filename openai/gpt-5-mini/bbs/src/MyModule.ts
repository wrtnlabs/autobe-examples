import { Module } from "@nestjs/common";

import { AuthGuestController } from "./controllers/auth/guest/AuthGuestController";
import { AuthRegistereduserController } from "./controllers/auth/registeredUser/AuthRegistereduserController";
import { AuthRegistereduserPasswordRequest_resetController } from "./controllers/auth/registeredUser/password/request-reset/AuthRegistereduserPasswordRequest_resetController";
import { AuthRegistereduserPasswordConfirm_resetController } from "./controllers/auth/registeredUser/password/confirm-reset/AuthRegistereduserPasswordConfirm_resetController";
import { AuthRegistereduserVerify_emailController } from "./controllers/auth/registeredUser/verify-email/AuthRegistereduserVerify_emailController";
import { AuthRegistereduserVerify_emailResendController } from "./controllers/auth/registeredUser/verify-email/resend/AuthRegistereduserVerify_emailResendController";
import { AuthRegistereduserPasswordChangeController } from "./controllers/auth/registeredUser/password/change/AuthRegistereduserPasswordChangeController";
import { AuthRegistereduserSessionsController } from "./controllers/auth/registeredUser/sessions/AuthRegistereduserSessionsController";
import { AuthRegistereduserSessionsRevoke_allController } from "./controllers/auth/registeredUser/sessions/revoke-all/AuthRegistereduserSessionsRevoke_allController";
import { AuthModeratorController } from "./controllers/auth/moderator/AuthModeratorController";
import { AuthModeratorPasswordResetController } from "./controllers/auth/moderator/password/reset/AuthModeratorPasswordResetController";
import { AuthModeratorPasswordConfirmController } from "./controllers/auth/moderator/password/confirm/AuthModeratorPasswordConfirmController";
import { AuthAdministratorController } from "./controllers/auth/administrator/AuthAdministratorController";
import { AuthAdministratorPasswordResetController } from "./controllers/auth/administrator/password/reset/AuthAdministratorPasswordResetController";
import { AuthAdministratorPasswordResetConfirmController } from "./controllers/auth/administrator/password/reset/confirm/AuthAdministratorPasswordResetConfirmController";
import { AuthAdministratorEmailVerifyController } from "./controllers/auth/administrator/email/verify/AuthAdministratorEmailVerifyController";
import { AuthAdministratorPasswordChangeController } from "./controllers/auth/administrator/password/change/AuthAdministratorPasswordChangeController";
import { AuthAdministratorSessionsRevokeController } from "./controllers/auth/administrator/sessions/revoke/AuthAdministratorSessionsRevokeController";
import { EconpoliticalforumCategoriesController } from "./controllers/econPoliticalForum/categories/EconpoliticalforumCategoriesController";
import { EconpoliticalforumAdministratorCategoriesController } from "./controllers/econPoliticalForum/administrator/categories/EconpoliticalforumAdministratorCategoriesController";
import { EconpoliticalforumAdministratorSitesettingsController } from "./controllers/econPoliticalForum/administrator/siteSettings/EconpoliticalforumAdministratorSitesettingsController";
import { EconpoliticalforumAdministratorFeatureflagsController } from "./controllers/econPoliticalForum/administrator/featureFlags/EconpoliticalforumAdministratorFeatureflagsController";
import { EconpoliticalforumFeatureflagsController } from "./controllers/econPoliticalForum/featureFlags/EconpoliticalforumFeatureflagsController";
import { EconpoliticalforumTagsController } from "./controllers/econPoliticalForum/tags/EconpoliticalforumTagsController";
import { EconpoliticalforumAdministratorTagsController } from "./controllers/econPoliticalForum/administrator/tags/EconpoliticalforumAdministratorTagsController";
import { EconpoliticalforumThreadsController } from "./controllers/econPoliticalForum/threads/EconpoliticalforumThreadsController";
import { EconpoliticalforumRegistereduserThreadsController } from "./controllers/econPoliticalForum/registeredUser/threads/EconpoliticalforumRegistereduserThreadsController";
import { EconpoliticalforumModeratorThreadsController } from "./controllers/econPoliticalForum/moderator/threads/EconpoliticalforumModeratorThreadsController";
import { EconpoliticalforumAdministratorThreadsController } from "./controllers/econPoliticalForum/administrator/threads/EconpoliticalforumAdministratorThreadsController";
import { EconpoliticalforumThreadsPostsController } from "./controllers/econPoliticalForum/threads/posts/EconpoliticalforumThreadsPostsController";
import { EconpoliticalforumPostsController } from "./controllers/econPoliticalForum/posts/EconpoliticalforumPostsController";
import { EconpoliticalforumRegistereduserPostsController } from "./controllers/econPoliticalForum/registeredUser/posts/EconpoliticalforumRegistereduserPostsController";
import { EconpoliticalforumModeratorPostsController } from "./controllers/econPoliticalForum/moderator/posts/EconpoliticalforumModeratorPostsController";
import { EconpoliticalforumAdministratorPostsController } from "./controllers/econPoliticalForum/administrator/posts/EconpoliticalforumAdministratorPostsController";
import { EconpoliticalforumRegistereduserPostsRevisionsController } from "./controllers/econPoliticalForum/registeredUser/posts/revisions/EconpoliticalforumRegistereduserPostsRevisionsController";
import { EconpoliticalforumModeratorPostsRevisionsController } from "./controllers/econPoliticalForum/moderator/posts/revisions/EconpoliticalforumModeratorPostsRevisionsController";
import { EconpoliticalforumAdministratorPostsRevisionsController } from "./controllers/econPoliticalForum/administrator/posts/revisions/EconpoliticalforumAdministratorPostsRevisionsController";
import { EconpoliticalforumRegistereduserPostsVotesController } from "./controllers/econPoliticalForum/registeredUser/posts/votes/EconpoliticalforumRegistereduserPostsVotesController";
import { EconpoliticalforumRegistereduserBookmarksController } from "./controllers/econPoliticalForum/registeredUser/bookmarks/EconpoliticalforumRegistereduserBookmarksController";
import { EconpoliticalforumRegistereduserUsersBookmarksController } from "./controllers/econPoliticalForum/registeredUser/users/bookmarks/EconpoliticalforumRegistereduserUsersBookmarksController";
import { EconpoliticalforumRegistereduserThreadsFollowsController } from "./controllers/econPoliticalForum/registeredUser/threads/follows/EconpoliticalforumRegistereduserThreadsFollowsController";
import { EconpoliticalforumRegistereduserThreadsTagsController } from "./controllers/econPoliticalForum/registeredUser/threads/tags/EconpoliticalforumRegistereduserThreadsTagsController";
import { EconpoliticalforumModeratorThreadsTagsController } from "./controllers/econPoliticalForum/moderator/threads/tags/EconpoliticalforumModeratorThreadsTagsController";
import { EconpoliticalforumModeratorReportsController } from "./controllers/econPoliticalForum/moderator/reports/EconpoliticalforumModeratorReportsController";
import { EconpoliticalforumAdministratorReportsController } from "./controllers/econPoliticalForum/administrator/reports/EconpoliticalforumAdministratorReportsController";
import { EconpoliticalforumReportsController } from "./controllers/econPoliticalForum/reports/EconpoliticalforumReportsController";
import { EconpoliticalforumModeratorModerationcasesController } from "./controllers/econPoliticalForum/moderator/moderationCases/EconpoliticalforumModeratorModerationcasesController";
import { EconpoliticalforumAdministratorModerationcasesController } from "./controllers/econPoliticalForum/administrator/moderationCases/EconpoliticalforumAdministratorModerationcasesController";
import { EconpoliticalforumModeratorModerationlogsController } from "./controllers/econPoliticalForum/moderator/moderationLogs/EconpoliticalforumModeratorModerationlogsController";
import { EconpoliticalforumAdministratorModerationlogsController } from "./controllers/econPoliticalForum/administrator/moderationLogs/EconpoliticalforumAdministratorModerationlogsController";
import { EconpoliticalforumAdministratorAuditlogsController } from "./controllers/econPoliticalForum/administrator/auditLogs/EconpoliticalforumAdministratorAuditlogsController";
import { EconpoliticalforumAdministratorLegalholdsController } from "./controllers/econPoliticalForum/administrator/legalHolds/EconpoliticalforumAdministratorLegalholdsController";
import { EconpoliticalforumAdministratorThreadsLegalholdsController } from "./controllers/econPoliticalForum/administrator/threads/legalHolds/EconpoliticalforumAdministratorThreadsLegalholdsController";
import { EconpoliticalforumAdministratorPostsLegalholdsController } from "./controllers/econPoliticalForum/administrator/posts/legalHolds/EconpoliticalforumAdministratorPostsLegalholdsController";
import { EconpoliticalforumRegistereduserNotificationsController } from "./controllers/econPoliticalForum/registeredUser/notifications/EconpoliticalforumRegistereduserNotificationsController";
import { EconpoliticalforumRegistereduserUsersNotificationsController } from "./controllers/econPoliticalForum/registeredUser/users/notifications/EconpoliticalforumRegistereduserUsersNotificationsController";
import { EconpoliticalforumAdministratorUsersController } from "./controllers/econPoliticalForum/administrator/users/EconpoliticalforumAdministratorUsersController";
import { EconpoliticalforumUsersController } from "./controllers/econPoliticalForum/users/EconpoliticalforumUsersController";
import { EconpoliticalforumRegistereduserUsersNotificationpreferencesController } from "./controllers/econPoliticalForum/registeredUser/users/notificationPreferences/EconpoliticalforumRegistereduserUsersNotificationpreferencesController";
import { EconpoliticalforumAdministratorUsersNotificationpreferencesController } from "./controllers/econPoliticalForum/administrator/users/notificationPreferences/EconpoliticalforumAdministratorUsersNotificationpreferencesController";
import { EconpoliticalforumTagsThreadsController } from "./controllers/econPoliticalForum/tags/threads/EconpoliticalforumTagsThreadsController";
import { EconpoliticalforumCategoriesThreadsController } from "./controllers/econPoliticalForum/categories/threads/EconpoliticalforumCategoriesThreadsController";

@Module({
  controllers: [
    AuthGuestController,
    AuthRegistereduserController,
    AuthRegistereduserPasswordRequest_resetController,
    AuthRegistereduserPasswordConfirm_resetController,
    AuthRegistereduserVerify_emailController,
    AuthRegistereduserVerify_emailResendController,
    AuthRegistereduserPasswordChangeController,
    AuthRegistereduserSessionsController,
    AuthRegistereduserSessionsRevoke_allController,
    AuthModeratorController,
    AuthModeratorPasswordResetController,
    AuthModeratorPasswordConfirmController,
    AuthAdministratorController,
    AuthAdministratorPasswordResetController,
    AuthAdministratorPasswordResetConfirmController,
    AuthAdministratorEmailVerifyController,
    AuthAdministratorPasswordChangeController,
    AuthAdministratorSessionsRevokeController,
    EconpoliticalforumCategoriesController,
    EconpoliticalforumAdministratorCategoriesController,
    EconpoliticalforumAdministratorSitesettingsController,
    EconpoliticalforumAdministratorFeatureflagsController,
    EconpoliticalforumFeatureflagsController,
    EconpoliticalforumTagsController,
    EconpoliticalforumAdministratorTagsController,
    EconpoliticalforumThreadsController,
    EconpoliticalforumRegistereduserThreadsController,
    EconpoliticalforumModeratorThreadsController,
    EconpoliticalforumAdministratorThreadsController,
    EconpoliticalforumThreadsPostsController,
    EconpoliticalforumPostsController,
    EconpoliticalforumRegistereduserPostsController,
    EconpoliticalforumModeratorPostsController,
    EconpoliticalforumAdministratorPostsController,
    EconpoliticalforumRegistereduserPostsRevisionsController,
    EconpoliticalforumModeratorPostsRevisionsController,
    EconpoliticalforumAdministratorPostsRevisionsController,
    EconpoliticalforumRegistereduserPostsVotesController,
    EconpoliticalforumRegistereduserBookmarksController,
    EconpoliticalforumRegistereduserUsersBookmarksController,
    EconpoliticalforumRegistereduserThreadsFollowsController,
    EconpoliticalforumRegistereduserThreadsTagsController,
    EconpoliticalforumModeratorThreadsTagsController,
    EconpoliticalforumModeratorReportsController,
    EconpoliticalforumAdministratorReportsController,
    EconpoliticalforumReportsController,
    EconpoliticalforumModeratorModerationcasesController,
    EconpoliticalforumAdministratorModerationcasesController,
    EconpoliticalforumModeratorModerationlogsController,
    EconpoliticalforumAdministratorModerationlogsController,
    EconpoliticalforumAdministratorAuditlogsController,
    EconpoliticalforumAdministratorLegalholdsController,
    EconpoliticalforumAdministratorThreadsLegalholdsController,
    EconpoliticalforumAdministratorPostsLegalholdsController,
    EconpoliticalforumRegistereduserNotificationsController,
    EconpoliticalforumRegistereduserUsersNotificationsController,
    EconpoliticalforumAdministratorUsersController,
    EconpoliticalforumUsersController,
    EconpoliticalforumRegistereduserUsersNotificationpreferencesController,
    EconpoliticalforumAdministratorUsersNotificationpreferencesController,
    EconpoliticalforumTagsThreadsController,
    EconpoliticalforumCategoriesThreadsController,
  ],
})
export class MyModule {}
