import { Module } from "@nestjs/common";

import { AuthGuestController } from "./controllers/auth/guest/AuthGuestController";
import { AuthMemberController } from "./controllers/auth/member/AuthMemberController";
import { AuthMemberPasswordChangeController } from "./controllers/auth/member/password/change/AuthMemberPasswordChangeController";
import { AuthMemberEmailVerifyController } from "./controllers/auth/member/email/verify/AuthMemberEmailVerifyController";
import { AuthMemberPasswordResetRequestController } from "./controllers/auth/member/password/reset/request/AuthMemberPasswordResetRequestController";
import { AuthMemberPasswordResetCompleteController } from "./controllers/auth/member/password/reset/complete/AuthMemberPasswordResetCompleteController";
import { AuthMemberEmailVerificationResendController } from "./controllers/auth/member/email/verification/resend/AuthMemberEmailVerificationResendController";
import { AuthModeratorController } from "./controllers/auth/moderator/AuthModeratorController";
import { AuthModeratorPasswordResetRequestController } from "./controllers/auth/moderator/password/reset/request/AuthModeratorPasswordResetRequestController";
import { AuthModeratorPasswordResetCompleteController } from "./controllers/auth/moderator/password/reset/complete/AuthModeratorPasswordResetCompleteController";
import { AuthModeratorPasswordChangeController } from "./controllers/auth/moderator/password/change/AuthModeratorPasswordChangeController";
import { AuthModeratorEmailVerifyController } from "./controllers/auth/moderator/email/verify/AuthModeratorEmailVerifyController";
import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { AuthAdminPasswordResetRequestController } from "./controllers/auth/admin/password/reset/request/AuthAdminPasswordResetRequestController";
import { AuthAdminPasswordResetCompleteController } from "./controllers/auth/admin/password/reset/complete/AuthAdminPasswordResetCompleteController";
import { AuthAdminPasswordChangeController } from "./controllers/auth/admin/password/change/AuthAdminPasswordChangeController";
import { AuthAdminEmailVerifyController } from "./controllers/auth/admin/email/verify/AuthAdminEmailVerifyController";
import { AuthAdminEmailVerifyResendController } from "./controllers/auth/admin/email/verify/resend/AuthAdminEmailVerifyResendController";
import { RedditlikeAuthSessionController } from "./controllers/redditLike/auth/session/validate/RedditlikeAuthSessionController";
import { RedditlikeMemberAuthMemberController } from "./controllers/redditLike/member/auth/member/logout/RedditlikeMemberAuthMemberController";
import { RedditlikeAuthGuestController } from "./controllers/redditLike/auth/guest/logout/RedditlikeAuthGuestController";
import { RedditlikeMemberCommunitiesController } from "./controllers/redditLike/member/communities/RedditlikeMemberCommunitiesController";
import { RedditlikeCommunitiesController } from "./controllers/redditLike/communities/RedditlikeCommunitiesController";
import { RedditlikeModeratorCommunitiesController } from "./controllers/redditLike/moderator/communities/RedditlikeModeratorCommunitiesController";
import { RedditlikeCommunitiesRulesController } from "./controllers/redditLike/communities/rules/RedditlikeCommunitiesRulesController";
import { RedditlikeModeratorCommunitiesRulesController } from "./controllers/redditLike/moderator/communities/rules/RedditlikeModeratorCommunitiesRulesController";
import { RedditlikeMemberCommunitiesSubscribeController } from "./controllers/redditLike/member/communities/subscribe/RedditlikeMemberCommunitiesSubscribeController";
import { RedditlikeCommunitiesSubscriptionsController } from "./controllers/redditLike/communities/subscriptions/RedditlikeCommunitiesSubscriptionsController";
import { RedditlikeCommunitiesModeratorsController } from "./controllers/redditLike/communities/moderators/RedditlikeCommunitiesModeratorsController";
import { RedditlikeModeratorCommunitiesModeratorsController } from "./controllers/redditLike/moderator/communities/moderators/RedditlikeModeratorCommunitiesModeratorsController";
import { RedditlikeAdminCommunitiesModeratorsController } from "./controllers/redditLike/admin/communities/moderators/RedditlikeAdminCommunitiesModeratorsController";
import { RedditlikeUsersSubscriptionsController } from "./controllers/redditLike/users/subscriptions/RedditlikeUsersSubscriptionsController";
import { RedditlikeMemberPostsController } from "./controllers/redditLike/member/posts/RedditlikeMemberPostsController";
import { RedditlikeModeratorPostsController } from "./controllers/redditLike/moderator/posts/RedditlikeModeratorPostsController";
import { RedditlikeAdminPostsController } from "./controllers/redditLike/admin/posts/RedditlikeAdminPostsController";
import { RedditlikePostsController } from "./controllers/redditLike/posts/RedditlikePostsController";
import { RedditlikeMemberCommunitiesPostsController } from "./controllers/redditLike/member/communities/posts/RedditlikeMemberCommunitiesPostsController";
import { RedditlikeModeratorCommunitiesPostsController } from "./controllers/redditLike/moderator/communities/posts/RedditlikeModeratorCommunitiesPostsController";
import { RedditlikeAdminCommunitiesPostsController } from "./controllers/redditLike/admin/communities/posts/RedditlikeAdminCommunitiesPostsController";
import { RedditlikeCommunitiesPostsController } from "./controllers/redditLike/communities/posts/RedditlikeCommunitiesPostsController";
import { RedditlikePostsMetricsController } from "./controllers/redditLike/posts/metrics/RedditlikePostsMetricsController";
import { RedditlikeMemberCommentsController } from "./controllers/redditLike/member/comments/RedditlikeMemberCommentsController";
import { RedditlikeModeratorCommentsController } from "./controllers/redditLike/moderator/comments/RedditlikeModeratorCommentsController";
import { RedditlikeAdminCommentsController } from "./controllers/redditLike/admin/comments/RedditlikeAdminCommentsController";
import { RedditlikeCommentsController } from "./controllers/redditLike/comments/RedditlikeCommentsController";
import { RedditlikePostsCommentsController } from "./controllers/redditLike/posts/comments/RedditlikePostsCommentsController";
import { RedditlikeMemberPostsCommentsController } from "./controllers/redditLike/member/posts/comments/RedditlikeMemberPostsCommentsController";
import { RedditlikeCommentsRepliesController } from "./controllers/redditLike/comments/replies/RedditlikeCommentsRepliesController";
import { RedditlikeMemberCommentsRepliesController } from "./controllers/redditLike/member/comments/replies/RedditlikeMemberCommentsRepliesController";
import { RedditlikeModeratorCommentsRepliesController } from "./controllers/redditLike/moderator/comments/replies/RedditlikeModeratorCommentsRepliesController";
import { RedditlikeAdminCommentsRepliesController } from "./controllers/redditLike/admin/comments/replies/RedditlikeAdminCommentsRepliesController";
import { RedditlikeMemberPostsVotesController } from "./controllers/redditLike/member/posts/votes/RedditlikeMemberPostsVotesController";
import { RedditlikeMemberPostsVotesMeController } from "./controllers/redditLike/member/posts/votes/me/RedditlikeMemberPostsVotesMeController";
import { RedditlikeModeratorPostsVotesMeController } from "./controllers/redditLike/moderator/posts/votes/me/RedditlikeModeratorPostsVotesMeController";
import { RedditlikeAdminPostsVotesMeController } from "./controllers/redditLike/admin/posts/votes/me/RedditlikeAdminPostsVotesMeController";
import { RedditlikeMemberCommentsVotesController } from "./controllers/redditLike/member/comments/votes/RedditlikeMemberCommentsVotesController";
import { RedditlikeModeratorCommentsVotesController } from "./controllers/redditLike/moderator/comments/votes/RedditlikeModeratorCommentsVotesController";
import { RedditlikeAdminCommentsVotesController } from "./controllers/redditLike/admin/comments/votes/RedditlikeAdminCommentsVotesController";
import { RedditlikePostsVotesMeController } from "./controllers/redditLike/posts/votes/me/RedditlikePostsVotesMeController";
import { RedditlikeCommentsVotesController } from "./controllers/redditLike/comments/votes/RedditlikeCommentsVotesController";
import { RedditlikeMemberCommentsVotesMeController } from "./controllers/redditLike/member/comments/votes/me/RedditlikeMemberCommentsVotesMeController";
import { RedditlikeUsersKarmaController } from "./controllers/redditLike/users/karma/RedditlikeUsersKarmaController";
import { RedditlikeMemberUsersKarmaHistoryController } from "./controllers/redditLike/member/users/karma/history/RedditlikeMemberUsersKarmaHistoryController";
import { RedditlikeContent_reportsController } from "./controllers/redditLike/content-reports/RedditlikeContent_reportsController";
import { RedditlikeModeratorContent_reportsController } from "./controllers/redditLike/moderator/content-reports/RedditlikeModeratorContent_reportsController";
import { RedditlikeAdminContent_reportsController } from "./controllers/redditLike/admin/content-reports/RedditlikeAdminContent_reportsController";
import { RedditlikeModeratorModerationActionsController } from "./controllers/redditLike/moderator/moderation/actions/RedditlikeModeratorModerationActionsController";
import { RedditlikeAdminModerationActionsController } from "./controllers/redditLike/admin/moderation/actions/RedditlikeAdminModerationActionsController";
import { RedditlikeModerationActionsController } from "./controllers/redditLike/moderation/actions/RedditlikeModerationActionsController";
import { RedditlikeModeratorCommunitiesBansController } from "./controllers/redditLike/moderator/communities/bans/RedditlikeModeratorCommunitiesBansController";
import { RedditlikeAdminCommunitiesBansController } from "./controllers/redditLike/admin/communities/bans/RedditlikeAdminCommunitiesBansController";
import { RedditlikeAdminPlatformSuspensionsController } from "./controllers/redditLike/admin/platform/suspensions/RedditlikeAdminPlatformSuspensionsController";
import { RedditlikeMemberModerationAppealsController } from "./controllers/redditLike/member/moderation/appeals/RedditlikeMemberModerationAppealsController";
import { RedditlikeModeratorModerationAppealsController } from "./controllers/redditLike/moderator/moderation/appeals/RedditlikeModeratorModerationAppealsController";
import { RedditlikeAdminModerationAppealsController } from "./controllers/redditLike/admin/moderation/appeals/RedditlikeAdminModerationAppealsController";
import { RedditlikeMemberModerationAppealsEscalateController } from "./controllers/redditLike/member/moderation/appeals/escalate/RedditlikeMemberModerationAppealsEscalateController";
import { RedditlikeModeratorModerationLogsController } from "./controllers/redditLike/moderator/moderation/logs/RedditlikeModeratorModerationLogsController";
import { RedditlikeAdminModerationLogsController } from "./controllers/redditLike/admin/moderation/logs/RedditlikeAdminModerationLogsController";
import { RedditlikeModerationLogsController } from "./controllers/redditLike/moderation/logs/RedditlikeModerationLogsController";
import { RedditlikeModeratorCommunitiesModeration_logController } from "./controllers/redditLike/moderator/communities/moderation-log/RedditlikeModeratorCommunitiesModeration_logController";
import { RedditlikeAdminCommunitiesModeration_logController } from "./controllers/redditLike/admin/communities/moderation-log/RedditlikeAdminCommunitiesModeration_logController";
import { RedditlikeAdminModeratorsController } from "./controllers/redditLike/admin/moderators/RedditlikeAdminModeratorsController";
import { RedditlikeUsersProfileController } from "./controllers/redditLike/users/profile/RedditlikeUsersProfileController";
import { RedditlikeMemberUsersProfileController } from "./controllers/redditLike/member/users/profile/RedditlikeMemberUsersProfileController";
import { RedditlikeModeratorUsersProfileController } from "./controllers/redditLike/moderator/users/profile/RedditlikeModeratorUsersProfileController";
import { RedditlikeAdminUsersProfileController } from "./controllers/redditLike/admin/users/profile/RedditlikeAdminUsersProfileController";
import { RedditlikeUsersController } from "./controllers/redditLike/users/RedditlikeUsersController";
import { RedditlikeMemberUsersSubscriptionsController } from "./controllers/redditLike/member/users/subscriptions/RedditlikeMemberUsersSubscriptionsController";
import { RedditlikeMemberUsersPrivacyController } from "./controllers/redditLike/member/users/privacy/RedditlikeMemberUsersPrivacyController";
import { RedditlikeSystemSettingsController } from "./controllers/redditLike/system/settings/RedditlikeSystemSettingsController";
import { RedditlikeAdminSystemSettingsController } from "./controllers/redditLike/admin/system/settings/RedditlikeAdminSystemSettingsController";
import { RedditlikeSystemSettings_publicController } from "./controllers/redditLike/system/settings/public/RedditlikeSystemSettings_publicController";

@Module({
  controllers: [
    AuthGuestController,
    AuthMemberController,
    AuthMemberPasswordChangeController,
    AuthMemberEmailVerifyController,
    AuthMemberPasswordResetRequestController,
    AuthMemberPasswordResetCompleteController,
    AuthMemberEmailVerificationResendController,
    AuthModeratorController,
    AuthModeratorPasswordResetRequestController,
    AuthModeratorPasswordResetCompleteController,
    AuthModeratorPasswordChangeController,
    AuthModeratorEmailVerifyController,
    AuthAdminController,
    AuthAdminPasswordResetRequestController,
    AuthAdminPasswordResetCompleteController,
    AuthAdminPasswordChangeController,
    AuthAdminEmailVerifyController,
    AuthAdminEmailVerifyResendController,
    RedditlikeAuthSessionController,
    RedditlikeMemberAuthMemberController,
    RedditlikeAuthGuestController,
    RedditlikeMemberCommunitiesController,
    RedditlikeCommunitiesController,
    RedditlikeModeratorCommunitiesController,
    RedditlikeCommunitiesRulesController,
    RedditlikeModeratorCommunitiesRulesController,
    RedditlikeMemberCommunitiesSubscribeController,
    RedditlikeCommunitiesSubscriptionsController,
    RedditlikeCommunitiesModeratorsController,
    RedditlikeModeratorCommunitiesModeratorsController,
    RedditlikeAdminCommunitiesModeratorsController,
    RedditlikeUsersSubscriptionsController,
    RedditlikeMemberPostsController,
    RedditlikeModeratorPostsController,
    RedditlikeAdminPostsController,
    RedditlikePostsController,
    RedditlikeMemberCommunitiesPostsController,
    RedditlikeModeratorCommunitiesPostsController,
    RedditlikeAdminCommunitiesPostsController,
    RedditlikeCommunitiesPostsController,
    RedditlikePostsMetricsController,
    RedditlikeMemberCommentsController,
    RedditlikeModeratorCommentsController,
    RedditlikeAdminCommentsController,
    RedditlikeCommentsController,
    RedditlikePostsCommentsController,
    RedditlikeMemberPostsCommentsController,
    RedditlikeCommentsRepliesController,
    RedditlikeMemberCommentsRepliesController,
    RedditlikeModeratorCommentsRepliesController,
    RedditlikeAdminCommentsRepliesController,
    RedditlikeMemberPostsVotesController,
    RedditlikeMemberPostsVotesMeController,
    RedditlikeModeratorPostsVotesMeController,
    RedditlikeAdminPostsVotesMeController,
    RedditlikeMemberCommentsVotesController,
    RedditlikeModeratorCommentsVotesController,
    RedditlikeAdminCommentsVotesController,
    RedditlikePostsVotesMeController,
    RedditlikeCommentsVotesController,
    RedditlikeMemberCommentsVotesMeController,
    RedditlikeUsersKarmaController,
    RedditlikeMemberUsersKarmaHistoryController,
    RedditlikeContent_reportsController,
    RedditlikeModeratorContent_reportsController,
    RedditlikeAdminContent_reportsController,
    RedditlikeModeratorModerationActionsController,
    RedditlikeAdminModerationActionsController,
    RedditlikeModerationActionsController,
    RedditlikeModeratorCommunitiesBansController,
    RedditlikeAdminCommunitiesBansController,
    RedditlikeAdminPlatformSuspensionsController,
    RedditlikeMemberModerationAppealsController,
    RedditlikeModeratorModerationAppealsController,
    RedditlikeAdminModerationAppealsController,
    RedditlikeMemberModerationAppealsEscalateController,
    RedditlikeModeratorModerationLogsController,
    RedditlikeAdminModerationLogsController,
    RedditlikeModerationLogsController,
    RedditlikeModeratorCommunitiesModeration_logController,
    RedditlikeAdminCommunitiesModeration_logController,
    RedditlikeAdminModeratorsController,
    RedditlikeUsersProfileController,
    RedditlikeMemberUsersProfileController,
    RedditlikeModeratorUsersProfileController,
    RedditlikeAdminUsersProfileController,
    RedditlikeUsersController,
    RedditlikeMemberUsersSubscriptionsController,
    RedditlikeMemberUsersPrivacyController,
    RedditlikeSystemSettingsController,
    RedditlikeAdminSystemSettingsController,
    RedditlikeSystemSettings_publicController,
  ],
})
export class MyModule {}
