import { Module } from "@nestjs/common";

import { RedditplatformAdminCommentsBulk_deleteController } from "./controllers/redditPlatform/admin/comments/bulk-delete/RedditplatformAdminCommentsBulk_deleteController";
import { RedditplatformAdminCommentsQueueController } from "./controllers/redditPlatform/admin/comments/queue/RedditplatformAdminCommentsQueueController";
import { RedditplatformAdminCommentsController } from "./controllers/redditPlatform/admin/comments/thread/RedditplatformAdminCommentsController";
import { RedditplatformAdminCommunitiesBanned_usersController } from "./controllers/redditPlatform/admin/communities/banned-users/RedditplatformAdminCommunitiesBanned_usersController";
import { RedditplatformAdminCommunitiesReportsController } from "./controllers/redditPlatform/admin/communities/reports/RedditplatformAdminCommunitiesReportsController";
import { RedditplatformAdminCommunitiesStatisticsController } from "./controllers/redditPlatform/admin/communities/statistics/RedditplatformAdminCommunitiesStatisticsController";
import { RedditplatformAdminPostsAnalyticsVotesController } from "./controllers/redditPlatform/admin/posts/analytics/votes/RedditplatformAdminPostsAnalyticsVotesController";
import { RedditplatformAdminPostsCommentsThread_analysisController } from "./controllers/redditPlatform/admin/posts/comments/thread-analysis/RedditplatformAdminPostsCommentsThread_analysisController";
import { RedditplatformAdminReportsController } from "./controllers/redditPlatform/admin/reports/RedditplatformAdminReportsController";
import { RedditplatformAdminsController } from "./controllers/redditPlatform/admins/RedditplatformAdminsController";
import { RedditplatformAuthAdminController } from "./controllers/redditPlatform/auth/admin/RedditplatformAuthAdminController";
import { RedditplatformAuthModeratorController } from "./controllers/redditPlatform/auth/moderator/RedditplatformAuthModeratorController";
import { RedditplatformAuthUserController } from "./controllers/redditPlatform/auth/user/RedditplatformAuthUserController";
import { RedditplatformCommentsController } from "./controllers/redditPlatform/comments/RedditplatformCommentsController";
import { RedditplatformCommentsVotesController } from "./controllers/redditPlatform/comments/votes/RedditplatformCommentsVotesController";
import { RedditplatformCommunitiesController } from "./controllers/redditPlatform/communities/RedditplatformCommunitiesController";
import { RedditplatformCommunitiesSearchController } from "./controllers/redditPlatform/communities/search/RedditplatformCommunitiesSearchController";
import { RedditplatformControversialController } from "./controllers/redditPlatform/controversial/RedditplatformControversialController";
import { RedditplatformHotController } from "./controllers/redditPlatform/hot/RedditplatformHotController";
import { RedditplatformModeratorBansController } from "./controllers/redditPlatform/moderator/bans/RedditplatformModeratorBansController";
import { RedditplatformModeratorCommentsBulk_deleteController } from "./controllers/redditPlatform/moderator/comments/bulk-delete/RedditplatformModeratorCommentsBulk_deleteController";
import { RedditplatformModeratorCommentsQueueController } from "./controllers/redditPlatform/moderator/comments/queue/RedditplatformModeratorCommentsQueueController";
import { RedditplatformModeratorCommentsController } from "./controllers/redditPlatform/moderator/comments/thread/RedditplatformModeratorCommentsController";
import { RedditplatformModeratorCommentsVote_historyController } from "./controllers/redditPlatform/moderator/comments/vote-history/RedditplatformModeratorCommentsVote_historyController";
import { RedditplatformModeratorCommunitiesBanned_usersController } from "./controllers/redditPlatform/moderator/communities/banned-users/RedditplatformModeratorCommunitiesBanned_usersController";
import { RedditplatformModeratorCommunitiesBansController } from "./controllers/redditPlatform/moderator/communities/bans/RedditplatformModeratorCommunitiesBansController";
import { RedditplatformModeratorCommunitiesModeratorsController } from "./controllers/redditPlatform/moderator/communities/moderators/RedditplatformModeratorCommunitiesModeratorsController";
import { RedditplatformModeratorCommunitiesReportsController } from "./controllers/redditPlatform/moderator/communities/reports/RedditplatformModeratorCommunitiesReportsController";
import { RedditplatformModeratorCommunitiesReportsModerationController } from "./controllers/redditPlatform/moderator/communities/reports/moderation/RedditplatformModeratorCommunitiesReportsModerationController";
import { RedditplatformModeratorKarma_historiesController } from "./controllers/redditPlatform/moderator/karma-histories/RedditplatformModeratorKarma_historiesController";
import { RedditplatformModeratorModeration_logsController } from "./controllers/redditPlatform/moderator/moderation-logs/RedditplatformModeratorModeration_logsController";
import { RedditplatformModeratorPostsAnalyticsVotesController } from "./controllers/redditPlatform/moderator/posts/analytics/votes/RedditplatformModeratorPostsAnalyticsVotesController";
import { RedditplatformModeratorPostsCommentsThread_analysisController } from "./controllers/redditPlatform/moderator/posts/comments/thread-analysis/RedditplatformModeratorPostsCommentsThread_analysisController";
import { RedditplatformModeratorReportsController } from "./controllers/redditPlatform/moderator/reports/RedditplatformModeratorReportsController";
import { RedditplatformModeratorsController } from "./controllers/redditPlatform/moderators/RedditplatformModeratorsController";
import { RedditplatformPopularController } from "./controllers/redditPlatform/popular/RedditplatformPopularController";
import { RedditplatformPostsController } from "./controllers/redditPlatform/posts/RedditplatformPostsController";
import { RedditplatformPostsCommentsController } from "./controllers/redditPlatform/posts/comments/RedditplatformPostsCommentsController";
import { RedditplatformPostsContentController } from "./controllers/redditPlatform/posts/content/RedditplatformPostsContentController";
import { RedditplatformPostsSnapshotsController } from "./controllers/redditPlatform/posts/snapshots/RedditplatformPostsSnapshotsController";
import { RedditplatformPostsVotesController } from "./controllers/redditPlatform/posts/votes/RedditplatformPostsVotesController";
import { RedditplatformSearchCommentsController } from "./controllers/redditPlatform/search/comments/RedditplatformSearchCommentsController";
import { RedditplatformTopController } from "./controllers/redditPlatform/top/RedditplatformTopController";
import { RedditplatformUser_activity_logsController } from "./controllers/redditPlatform/user-activity-logs/RedditplatformUser_activity_logsController";
import { RedditplatformUserAccountController } from "./controllers/redditPlatform/user/account/RedditplatformUserAccountController";
import { RedditplatformUserBansController } from "./controllers/redditPlatform/user/bans/RedditplatformUserBansController";
import { RedditplatformUserComment_votesController } from "./controllers/redditPlatform/user/comment-votes/RedditplatformUserComment_votesController";
import { RedditplatformUserCommentsReportsController } from "./controllers/redditPlatform/user/comments/reports/RedditplatformUserCommentsReportsController";
import { RedditplatformUserCommentsStatisticsController } from "./controllers/redditPlatform/user/comments/statistics/RedditplatformUserCommentsStatisticsController";
import { RedditplatformUserCommentsController } from "./controllers/redditPlatform/user/comments/thread/RedditplatformUserCommentsController";
import { RedditplatformUserCommentsVisibilityController } from "./controllers/redditPlatform/user/comments/visibility/RedditplatformUserCommentsVisibilityController";
import { RedditplatformUserCommentsVote_historyController } from "./controllers/redditPlatform/user/comments/vote-history/RedditplatformUserCommentsVote_historyController";
import { RedditplatformUserCommentsVoteController } from "./controllers/redditPlatform/user/comments/vote/RedditplatformUserCommentsVoteController";
import { RedditplatformUserCommentsVoteSelfController } from "./controllers/redditPlatform/user/comments/vote/self/RedditplatformUserCommentsVoteSelfController";
import { RedditplatformUserCommentsVotesController } from "./controllers/redditPlatform/user/comments/votes/RedditplatformUserCommentsVotesController";
import { RedditplatformUserCommunitiesController } from "./controllers/redditPlatform/user/communities/RedditplatformUserCommunitiesController";
import { RedditplatformUserDashboardController } from "./controllers/redditPlatform/user/dashboard/RedditplatformUserDashboardController";
import { RedditplatformUserEmail_verificationsController } from "./controllers/redditPlatform/user/email-verifications/RedditplatformUserEmail_verificationsController";
import { RedditplatformUserKarmaHistoryController } from "./controllers/redditPlatform/user/karma/history/RedditplatformUserKarmaHistoryController";
import { RedditplatformUserPassword_resetsController } from "./controllers/redditPlatform/user/password-resets/RedditplatformUserPassword_resetsController";
import { RedditplatformUserPasswordController } from "./controllers/redditPlatform/user/password/RedditplatformUserPasswordController";
import { RedditplatformUserPostsController } from "./controllers/redditPlatform/user/posts/RedditplatformUserPostsController";
import { RedditplatformUserPostsCommentsThread_analysisController } from "./controllers/redditPlatform/user/posts/comments/thread-analysis/RedditplatformUserPostsCommentsThread_analysisController";
import { RedditplatformUserPostsReportsController } from "./controllers/redditPlatform/user/posts/reports/RedditplatformUserPostsReportsController";
import { RedditplatformUserPostsStatisticsController } from "./controllers/redditPlatform/user/posts/statistics/RedditplatformUserPostsStatisticsController";
import { RedditplatformUserPostsVote_statusController } from "./controllers/redditPlatform/user/posts/vote-status/RedditplatformUserPostsVote_statusController";
import { RedditplatformUserPostsVotesController } from "./controllers/redditPlatform/user/posts/votes/RedditplatformUserPostsVotesController";
import { RedditplatformUserProfileController } from "./controllers/redditPlatform/user/profile/RedditplatformUserProfileController";
import { RedditplatformUserProfileAvatarController } from "./controllers/redditPlatform/user/profile/avatar/RedditplatformUserProfileAvatarController";
import { RedditplatformUserRedditplatformPostsVotesController } from "./controllers/redditPlatform/user/redditPlatform/posts/votes/RedditplatformUserRedditplatformPostsVotesController";
import { RedditplatformUserSessionsController } from "./controllers/redditPlatform/user/sessions/RedditplatformUserSessionsController";
import { RedditplatformUserStatisticsController } from "./controllers/redditPlatform/user/statistics/RedditplatformUserStatisticsController";
import { RedditplatformUserUserModerated_communitiesController } from "./controllers/redditPlatform/user/user/moderated-communities/RedditplatformUserUserModerated_communitiesController";
import { RedditplatformUserUsersMeKarmaPost_votesController } from "./controllers/redditPlatform/user/users/me/karma/post-votes/RedditplatformUserUsersMeKarmaPost_votesController";
import { RedditplatformUserUsersSubscribed_communitiesController } from "./controllers/redditPlatform/user/users/subscribed-communities/RedditplatformUserUsersSubscribed_communitiesController";
import { RedditplatformUsersController } from "./controllers/redditPlatform/users/RedditplatformUsersController";

@Module({
  controllers: [
    RedditplatformAuthUserController,
    RedditplatformAuthModeratorController,
    RedditplatformAuthAdminController,
    RedditplatformUsersController,
    RedditplatformUserProfileController,
    RedditplatformUserSessionsController,
    RedditplatformUserPassword_resetsController,
    RedditplatformUserEmail_verificationsController,
    RedditplatformModeratorsController,
    RedditplatformAdminsController,
    RedditplatformCommunitiesController,
    RedditplatformUserCommunitiesController,
    RedditplatformUserPostsController,
    RedditplatformPostsController,
    RedditplatformPostsContentController,
    RedditplatformPostsSnapshotsController,
    RedditplatformCommentsController,
    RedditplatformPostsCommentsController,
    RedditplatformUserRedditplatformPostsVotesController,
    RedditplatformUserCommentsVotesController,
    RedditplatformUserComment_votesController,
    RedditplatformModeratorReportsController,
    RedditplatformModeratorCommunitiesBansController,
    RedditplatformModeratorBansController,
    RedditplatformModeratorModeration_logsController,
    RedditplatformUser_activity_logsController,
    RedditplatformModeratorCommunitiesModeratorsController,
    RedditplatformModeratorKarma_historiesController,
    RedditplatformUserProfileAvatarController,
    RedditplatformUserDashboardController,
    RedditplatformUserBansController,
    RedditplatformUserPasswordController,
    RedditplatformUserStatisticsController,
    RedditplatformUserPostsStatisticsController,
    RedditplatformUserCommentsStatisticsController,
    RedditplatformUserKarmaHistoryController,
    RedditplatformUserAccountController,
    RedditplatformCommunitiesSearchController,
    RedditplatformUserUsersSubscribed_communitiesController,
    RedditplatformUserUserModerated_communitiesController,
    RedditplatformModeratorCommunitiesBanned_usersController,
    RedditplatformAdminCommunitiesBanned_usersController,
    RedditplatformAdminCommunitiesStatisticsController,
    RedditplatformUserPostsReportsController,
    RedditplatformUserPostsVotesController,
    RedditplatformPostsVotesController,
    RedditplatformCommentsVotesController,
    RedditplatformPopularController,
    RedditplatformModeratorCommentsQueueController,
    RedditplatformAdminCommentsQueueController,
    RedditplatformUserPostsCommentsThread_analysisController,
    RedditplatformModeratorPostsCommentsThread_analysisController,
    RedditplatformAdminPostsCommentsThread_analysisController,
    RedditplatformModeratorCommentsBulk_deleteController,
    RedditplatformAdminCommentsBulk_deleteController,
    RedditplatformSearchCommentsController,
    RedditplatformUserCommentsController,
    RedditplatformModeratorCommentsController,
    RedditplatformAdminCommentsController,
    RedditplatformUserCommentsVisibilityController,
    RedditplatformUserCommentsReportsController,
    RedditplatformUserPostsVote_statusController,
    RedditplatformModeratorPostsAnalyticsVotesController,
    RedditplatformAdminPostsAnalyticsVotesController,
    RedditplatformUserUsersMeKarmaPost_votesController,
    RedditplatformHotController,
    RedditplatformControversialController,
    RedditplatformTopController,
    RedditplatformUserCommentsVoteSelfController,
    RedditplatformUserCommentsVoteController,
    RedditplatformUserCommentsVote_historyController,
    RedditplatformModeratorCommentsVote_historyController,
    RedditplatformAdminReportsController,
    RedditplatformModeratorCommunitiesReportsController,
    RedditplatformAdminCommunitiesReportsController,
    RedditplatformModeratorCommunitiesReportsModerationController,
  ],
})
export class MyModule {}
