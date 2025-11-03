import { Module } from "@nestjs/common";

import { AuthUserController } from "./controllers/auth/user/AuthUserController";
import { AuthUserPasswordResetController } from "./controllers/auth/user/password/reset/AuthUserPasswordResetController";
import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { AuthAdminPasswordResetRequestController } from "./controllers/auth/admin/password/reset/request/AuthAdminPasswordResetRequestController";
import { AuthAdminPasswordResetConfirmController } from "./controllers/auth/admin/password/reset/confirm/AuthAdminPasswordResetConfirmController";
import { CommunityplatformAdminSettingsController } from "./controllers/communityPlatform/admin/settings/CommunityplatformAdminSettingsController";
import { CommunityplatformAdminAuditlogsController } from "./controllers/communityPlatform/admin/auditLogs/CommunityplatformAdminAuditlogsController";
import { CommunityplatformAdminUsersController } from "./controllers/communityPlatform/admin/users/CommunityplatformAdminUsersController";
import { CommunityplatformUserUsersController } from "./controllers/communityPlatform/user/users/CommunityplatformUserUsersController";
import { CommunityplatformAdminAdminsController } from "./controllers/communityPlatform/admin/admins/CommunityplatformAdminAdminsController";
import { CommunityplatformUserUsersSessionsController } from "./controllers/communityPlatform/user/users/sessions/CommunityplatformUserUsersSessionsController";
import { CommunityplatformAdminUsersSessionsController } from "./controllers/communityPlatform/admin/users/sessions/CommunityplatformAdminUsersSessionsController";
import { CommunityplatformAdminAdminsSessionsController } from "./controllers/communityPlatform/admin/admins/sessions/CommunityplatformAdminAdminsSessionsController";
import { CommunityplatformUserUsersVerificationtokensController } from "./controllers/communityPlatform/user/users/verificationTokens/CommunityplatformUserUsersVerificationtokensController";
import { CommunityplatformAdminUsersVerificationtokensController } from "./controllers/communityPlatform/admin/users/verificationTokens/CommunityplatformAdminUsersVerificationtokensController";
import { CommunityplatformUserUsersPasswordresettokensController } from "./controllers/communityPlatform/user/users/passwordResetTokens/CommunityplatformUserUsersPasswordresettokensController";
import { CommunityplatformAdminUsersPasswordresettokensController } from "./controllers/communityPlatform/admin/users/passwordResetTokens/CommunityplatformAdminUsersPasswordresettokensController";
import { CommunityplatformUserUsersLoginattemptsController } from "./controllers/communityPlatform/user/users/loginAttempts/CommunityplatformUserUsersLoginattemptsController";
import { CommunityplatformAdminUsersLoginattemptsController } from "./controllers/communityPlatform/admin/users/loginAttempts/CommunityplatformAdminUsersLoginattemptsController";
import { CommunityplatformAdminAdminsVerificationtokensController } from "./controllers/communityPlatform/admin/admins/verificationTokens/CommunityplatformAdminAdminsVerificationtokensController";
import { CommunityplatformAdminAdminsPasswordresettokensController } from "./controllers/communityPlatform/admin/admins/passwordResetTokens/CommunityplatformAdminAdminsPasswordresettokensController";
import { CommunityplatformAdminAdminsLoginattemptsController } from "./controllers/communityPlatform/admin/admins/loginAttempts/CommunityplatformAdminAdminsLoginattemptsController";
import { CommunityplatformCommunitiesController } from "./controllers/communityPlatform/communities/CommunityplatformCommunitiesController";
import { CommunityplatformUserCommunitiesController } from "./controllers/communityPlatform/user/communities/CommunityplatformUserCommunitiesController";
import { CommunityplatformAdminCommunitiesController } from "./controllers/communityPlatform/admin/communities/CommunityplatformAdminCommunitiesController";
import { CommunityplatformAdminCommunitiesEdithistoriesController } from "./controllers/communityPlatform/admin/communities/editHistories/CommunityplatformAdminCommunitiesEdithistoriesController";
import { CommunityplatformAdminCommunitiesArchivesController } from "./controllers/communityPlatform/admin/communities/archives/CommunityplatformAdminCommunitiesArchivesController";
import { CommunityplatformUserCommunitiesMembershipsController } from "./controllers/communityPlatform/user/communities/memberships/CommunityplatformUserCommunitiesMembershipsController";
import { CommunityplatformAdminCommunitiesMembershipsController } from "./controllers/communityPlatform/admin/communities/memberships/CommunityplatformAdminCommunitiesMembershipsController";
import { CommunityplatformCommunitiesModeratorsController } from "./controllers/communityPlatform/communities/moderators/CommunityplatformCommunitiesModeratorsController";
import { CommunityplatformUserCommunitiesModeratorsController } from "./controllers/communityPlatform/user/communities/moderators/CommunityplatformUserCommunitiesModeratorsController";
import { CommunityplatformAdminCommunitiesModeratorsController } from "./controllers/communityPlatform/admin/communities/moderators/CommunityplatformAdminCommunitiesModeratorsController";
import { CommunityplatformAdminCommunitiesModeratorinvitationsController } from "./controllers/communityPlatform/admin/communities/moderatorInvitations/CommunityplatformAdminCommunitiesModeratorinvitationsController";
import { CommunityplatformUserCommunitiesModeratorinvitationsController } from "./controllers/communityPlatform/user/communities/moderatorInvitations/CommunityplatformUserCommunitiesModeratorinvitationsController";
import { CommunityplatformUserCommunitiesBansController } from "./controllers/communityPlatform/user/communities/bans/CommunityplatformUserCommunitiesBansController";
import { CommunityplatformAdminCommunitiesBansController } from "./controllers/communityPlatform/admin/communities/bans/CommunityplatformAdminCommunitiesBansController";
import { CommunityplatformPostsController } from "./controllers/communityPlatform/posts/CommunityplatformPostsController";
import { CommunityplatformUserPostsController } from "./controllers/communityPlatform/user/posts/CommunityplatformUserPostsController";
import { CommunityplatformAdminPostsController } from "./controllers/communityPlatform/admin/posts/CommunityplatformAdminPostsController";
import { CommunityplatformUserPostsEdithistoriesController } from "./controllers/communityPlatform/user/posts/editHistories/CommunityplatformUserPostsEdithistoriesController";
import { CommunityplatformAdminPostsEdithistoriesController } from "./controllers/communityPlatform/admin/posts/editHistories/CommunityplatformAdminPostsEdithistoriesController";
import { CommunityplatformUserPostsArchivesController } from "./controllers/communityPlatform/user/posts/archives/CommunityplatformUserPostsArchivesController";
import { CommunityplatformAdminPostsArchivesController } from "./controllers/communityPlatform/admin/posts/archives/CommunityplatformAdminPostsArchivesController";
import { CommunityplatformAdminPostsDeletedplaceholderController } from "./controllers/communityPlatform/admin/posts/deletedPlaceholder/CommunityplatformAdminPostsDeletedplaceholderController";
import { CommunityplatformUserPostsTextController } from "./controllers/communityPlatform/user/posts/text/CommunityplatformUserPostsTextController";
import { CommunityplatformUserPostsLinksController } from "./controllers/communityPlatform/user/posts/links/CommunityplatformUserPostsLinksController";
import { CommunityplatformUserPostsImagesController } from "./controllers/communityPlatform/user/posts/images/CommunityplatformUserPostsImagesController";
import { CommunityplatformUserCommentsController } from "./controllers/communityPlatform/user/comments/CommunityplatformUserCommentsController";
import { CommunityplatformAdminCommentsController } from "./controllers/communityPlatform/admin/comments/CommunityplatformAdminCommentsController";
import { CommunityplatformUserCommentsEdithistoriesController } from "./controllers/communityPlatform/user/comments/editHistories/CommunityplatformUserCommentsEdithistoriesController";
import { CommunityplatformAdminCommentsEdithistoriesController } from "./controllers/communityPlatform/admin/comments/editHistories/CommunityplatformAdminCommentsEdithistoriesController";
import { CommunityplatformAdminPostvotesController } from "./controllers/communityPlatform/admin/postVotes/CommunityplatformAdminPostvotesController";
import { CommunityplatformUserPostvotesController } from "./controllers/communityPlatform/user/postVotes/CommunityplatformUserPostvotesController";
import { CommunityplatformAdminCommentvotesController } from "./controllers/communityPlatform/admin/commentVotes/CommunityplatformAdminCommentvotesController";
import { CommunityplatformUserCommentvotesController } from "./controllers/communityPlatform/user/commentVotes/CommunityplatformUserCommentvotesController";
import { CommunityplatformUserSubscriptionsController } from "./controllers/communityPlatform/user/subscriptions/CommunityplatformUserSubscriptionsController";
import { CommunityplatformAdminSubscriptionsController } from "./controllers/communityPlatform/admin/subscriptions/CommunityplatformAdminSubscriptionsController";
import { CommunityplatformUserSubscriptionsNotificationpreferencesController } from "./controllers/communityPlatform/user/subscriptions/notificationPreferences/CommunityplatformUserSubscriptionsNotificationpreferencesController";
import { CommunityplatformAdminSubscriptionsNotificationpreferencesController } from "./controllers/communityPlatform/admin/subscriptions/notificationPreferences/CommunityplatformAdminSubscriptionsNotificationpreferencesController";
import { CommunityplatformAdminReportsController } from "./controllers/communityPlatform/admin/reports/CommunityplatformAdminReportsController";
import { CommunityplatformUserReportsController } from "./controllers/communityPlatform/user/reports/CommunityplatformUserReportsController";
import { CommunityplatformAdminReportsActionsController } from "./controllers/communityPlatform/admin/reports/actions/CommunityplatformAdminReportsActionsController";
import { CommunityplatformAdminReportsPostController } from "./controllers/communityPlatform/admin/reports/post/CommunityplatformAdminReportsPostController";
import { CommunityplatformAdminReportsCommentController } from "./controllers/communityPlatform/admin/reports/comment/CommunityplatformAdminReportsCommentController";
import { CommunityplatformAdminKarmastatsController } from "./controllers/communityPlatform/admin/karmaStats/CommunityplatformAdminKarmastatsController";
import { CommunityplatformUserKarmastatsController } from "./controllers/communityPlatform/user/karmaStats/CommunityplatformUserKarmastatsController";
import { CommunityplatformAdminKarmaauditlogsController } from "./controllers/communityPlatform/admin/karmaAuditLogs/CommunityplatformAdminKarmaauditlogsController";

@Module({
  controllers: [
    AuthUserController,
    AuthUserPasswordResetController,
    AuthAdminController,
    AuthAdminPasswordResetRequestController,
    AuthAdminPasswordResetConfirmController,
    CommunityplatformAdminSettingsController,
    CommunityplatformAdminAuditlogsController,
    CommunityplatformAdminUsersController,
    CommunityplatformUserUsersController,
    CommunityplatformAdminAdminsController,
    CommunityplatformUserUsersSessionsController,
    CommunityplatformAdminUsersSessionsController,
    CommunityplatformAdminAdminsSessionsController,
    CommunityplatformUserUsersVerificationtokensController,
    CommunityplatformAdminUsersVerificationtokensController,
    CommunityplatformUserUsersPasswordresettokensController,
    CommunityplatformAdminUsersPasswordresettokensController,
    CommunityplatformUserUsersLoginattemptsController,
    CommunityplatformAdminUsersLoginattemptsController,
    CommunityplatformAdminAdminsVerificationtokensController,
    CommunityplatformAdminAdminsPasswordresettokensController,
    CommunityplatformAdminAdminsLoginattemptsController,
    CommunityplatformCommunitiesController,
    CommunityplatformUserCommunitiesController,
    CommunityplatformAdminCommunitiesController,
    CommunityplatformAdminCommunitiesEdithistoriesController,
    CommunityplatformAdminCommunitiesArchivesController,
    CommunityplatformUserCommunitiesMembershipsController,
    CommunityplatformAdminCommunitiesMembershipsController,
    CommunityplatformCommunitiesModeratorsController,
    CommunityplatformUserCommunitiesModeratorsController,
    CommunityplatformAdminCommunitiesModeratorsController,
    CommunityplatformAdminCommunitiesModeratorinvitationsController,
    CommunityplatformUserCommunitiesModeratorinvitationsController,
    CommunityplatformUserCommunitiesBansController,
    CommunityplatformAdminCommunitiesBansController,
    CommunityplatformPostsController,
    CommunityplatformUserPostsController,
    CommunityplatformAdminPostsController,
    CommunityplatformUserPostsEdithistoriesController,
    CommunityplatformAdminPostsEdithistoriesController,
    CommunityplatformUserPostsArchivesController,
    CommunityplatformAdminPostsArchivesController,
    CommunityplatformAdminPostsDeletedplaceholderController,
    CommunityplatformUserPostsTextController,
    CommunityplatformUserPostsLinksController,
    CommunityplatformUserPostsImagesController,
    CommunityplatformUserCommentsController,
    CommunityplatformAdminCommentsController,
    CommunityplatformUserCommentsEdithistoriesController,
    CommunityplatformAdminCommentsEdithistoriesController,
    CommunityplatformAdminPostvotesController,
    CommunityplatformUserPostvotesController,
    CommunityplatformAdminCommentvotesController,
    CommunityplatformUserCommentvotesController,
    CommunityplatformUserSubscriptionsController,
    CommunityplatformAdminSubscriptionsController,
    CommunityplatformUserSubscriptionsNotificationpreferencesController,
    CommunityplatformAdminSubscriptionsNotificationpreferencesController,
    CommunityplatformAdminReportsController,
    CommunityplatformUserReportsController,
    CommunityplatformAdminReportsActionsController,
    CommunityplatformAdminReportsPostController,
    CommunityplatformAdminReportsCommentController,
    CommunityplatformAdminKarmastatsController,
    CommunityplatformUserKarmastatsController,
    CommunityplatformAdminKarmaauditlogsController,
  ],
})
export class MyModule {}
