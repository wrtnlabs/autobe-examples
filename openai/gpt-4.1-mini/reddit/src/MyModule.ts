import { Module } from "@nestjs/common";

import { CommunityplatformActivitylogsController } from "./controllers/communityPlatform/activityLogs/CommunityplatformActivitylogsController";
import { CommunityplatformAdminActivity_logsAnalyticsController } from "./controllers/communityPlatform/admin/activity-logs/analytics/CommunityplatformAdminActivity_logsAnalyticsController";
import { CommunityplatformAdminAnalyticsCommunitiesSubscriptionsController } from "./controllers/communityPlatform/admin/analytics/communities/subscriptions/CommunityplatformAdminAnalyticsCommunitiesSubscriptionsController";
import { CommunityplatformAdminAnalyticsModerationController } from "./controllers/communityPlatform/admin/analytics/moderation/CommunityplatformAdminAnalyticsModerationController";
import { CommunityplatformAdminAnalyticsPostsVotesController } from "./controllers/communityPlatform/admin/analytics/posts/votes/CommunityplatformAdminAnalyticsPostsVotesController";
import { CommunityplatformAdminBannedusersController } from "./controllers/communityPlatform/admin/bannedUsers/CommunityplatformAdminBannedusersController";
import { CommunityplatformAdminCommentsController } from "./controllers/communityPlatform/admin/comments/CommunityplatformAdminCommentsController";
import { CommunityplatformAdminCommentsSort_ordersController } from "./controllers/communityPlatform/admin/comments/sort-orders/CommunityplatformAdminCommentsSort_ordersController";
import { CommunityplatformAdminCommentsVote_statsController } from "./controllers/communityPlatform/admin/comments/vote-stats/CommunityplatformAdminCommentsVote_statsController";
import { CommunityplatformAdminCommentsVotesController } from "./controllers/communityPlatform/admin/comments/votes/CommunityplatformAdminCommentsVotesController";
import { CommunityplatformAdminCommunitiesBansController } from "./controllers/communityPlatform/admin/communities/bans/CommunityplatformAdminCommunitiesBansController";
import { CommunityplatformAdminCommunity_banned_usersController } from "./controllers/communityPlatform/admin/community-banned-users/CommunityplatformAdminCommunity_banned_usersController";
import { CommunityplatformAdminCommunitymoderatorsController } from "./controllers/communityPlatform/admin/communityModerators/CommunityplatformAdminCommunitymoderatorsController";
import { CommunityplatformAdminModeration_logsController } from "./controllers/communityPlatform/admin/moderation-logs/CommunityplatformAdminModeration_logsController";
import { CommunityplatformAdminPostsCommentsSortedController } from "./controllers/communityPlatform/admin/posts/comments/sorted/CommunityplatformAdminPostsCommentsSortedController";
import { CommunityplatformAdminPostsSnapshotsController } from "./controllers/communityPlatform/admin/posts/snapshots/CommunityplatformAdminPostsSnapshotsController";
import { CommunityplatformAdminReported_contentsDetailsController } from "./controllers/communityPlatform/admin/reported-contents/details/CommunityplatformAdminReported_contentsDetailsController";
import { CommunityplatformAdminReportsController } from "./controllers/communityPlatform/admin/reports/CommunityplatformAdminReportsController";
import { CommunityplatformAdminReportsPendingController } from "./controllers/communityPlatform/admin/reports/pending/CommunityplatformAdminReportsPendingController";
import { CommunityplatformAdminsController } from "./controllers/communityPlatform/admins/CommunityplatformAdminsController";
import { CommunityplatformAuthAdminController } from "./controllers/communityPlatform/auth/admin/CommunityplatformAuthAdminController";
import { CommunityplatformAuthGuestController } from "./controllers/communityPlatform/auth/guest/CommunityplatformAuthGuestController";
import { CommunityplatformAuthModeratorController } from "./controllers/communityPlatform/auth/moderator/CommunityplatformAuthModeratorController";
import { CommunityplatformAuthUserController } from "./controllers/communityPlatform/auth/user/CommunityplatformAuthUserController";
import { CommunityplatformCommunitiesController } from "./controllers/communityPlatform/communities/CommunityplatformCommunitiesController";
import { CommunityplatformGuestCommunitiesBrowseController } from "./controllers/communityPlatform/guest/communities/browse/CommunityplatformGuestCommunitiesBrowseController";
import { CommunityplatformGuestCommunitiesPostsController } from "./controllers/communityPlatform/guest/communities/posts/CommunityplatformGuestCommunitiesPostsController";
import { CommunityplatformGuestGuestsController } from "./controllers/communityPlatform/guest/guests/CommunityplatformGuestGuestsController";
import { CommunityplatformGuestPostsCommentsSortedController } from "./controllers/communityPlatform/guest/posts/comments/sorted/CommunityplatformGuestPostsCommentsSortedController";
import { CommunityplatformGuestPostsFeedPopularController } from "./controllers/communityPlatform/guest/posts/feed/popular/CommunityplatformGuestPostsFeedPopularController";
import { CommunityplatformGuestSessionsController } from "./controllers/communityPlatform/guest/sessions/CommunityplatformGuestSessionsController";
import { CommunityplatformModeratorBannedusersController } from "./controllers/communityPlatform/moderator/bannedUsers/CommunityplatformModeratorBannedusersController";
import { CommunityplatformModeratorComment_reportsController } from "./controllers/communityPlatform/moderator/comment-reports/CommunityplatformModeratorComment_reportsController";
import { CommunityplatformModeratorComment_votesModeratorsController } from "./controllers/communityPlatform/moderator/comment-votes/moderators/CommunityplatformModeratorComment_votesModeratorsController";
import { CommunityplatformModeratorCommentsController } from "./controllers/communityPlatform/moderator/comments/CommunityplatformModeratorCommentsController";
import { CommunityplatformModeratorCommentsSort_ordersController } from "./controllers/communityPlatform/moderator/comments/sort-orders/CommunityplatformModeratorCommentsSort_ordersController";
import { CommunityplatformModeratorCommentsVote_statsController } from "./controllers/communityPlatform/moderator/comments/vote-stats/CommunityplatformModeratorCommentsVote_statsController";
import { CommunityplatformModeratorCommentsVotesController } from "./controllers/communityPlatform/moderator/comments/votes/CommunityplatformModeratorCommentsVotesController";
import { CommunityplatformModeratorCommunitiesBanned_usersController } from "./controllers/communityPlatform/moderator/communities/banned-users/CommunityplatformModeratorCommunitiesBanned_usersController";
import { CommunityplatformModeratorCommunitiesBanned_usersUnbanController } from "./controllers/communityPlatform/moderator/communities/banned-users/unban/CommunityplatformModeratorCommunitiesBanned_usersUnbanController";
import { CommunityplatformModeratorCommunitiesBansController } from "./controllers/communityPlatform/moderator/communities/bans/CommunityplatformModeratorCommunitiesBansController";
import { CommunityplatformModeratorCommunity_banned_usersController } from "./controllers/communityPlatform/moderator/community-banned-users/CommunityplatformModeratorCommunity_banned_usersController";
import { CommunityplatformModeratorCommunity_bansController } from "./controllers/communityPlatform/moderator/community-bans/CommunityplatformModeratorCommunity_bansController";
import { CommunityplatformModeratorCommunity_bansBatchController } from "./controllers/communityPlatform/moderator/community-bans/batch/CommunityplatformModeratorCommunity_bansBatchController";
import { CommunityplatformModeratorCommunity_bansBatchUnbanController } from "./controllers/communityPlatform/moderator/community-bans/batch/unban/CommunityplatformModeratorCommunity_bansBatchUnbanController";
import { CommunityplatformModeratorCommunityBanController } from "./controllers/communityPlatform/moderator/community/ban/CommunityplatformModeratorCommunityBanController";
import { CommunityplatformModeratorCommunityBanned_usersController } from "./controllers/communityPlatform/moderator/community/banned-users/CommunityplatformModeratorCommunityBanned_usersController";
import { CommunityplatformModeratorCommunityReportsController } from "./controllers/communityPlatform/moderator/community/reports/CommunityplatformModeratorCommunityReportsController";
import { CommunityplatformModeratorCommunityReportsApproveController } from "./controllers/communityPlatform/moderator/community/reports/approve/CommunityplatformModeratorCommunityReportsApproveController";
import { CommunityplatformModeratorCommunitymoderatorsController } from "./controllers/communityPlatform/moderator/communityModerators/CommunityplatformModeratorCommunitymoderatorsController";
import { CommunityplatformModeratorDeletedcontentsController } from "./controllers/communityPlatform/moderator/deletedContents/CommunityplatformModeratorDeletedcontentsController";
import { CommunityplatformModeratorModeration_logsController } from "./controllers/communityPlatform/moderator/moderation-logs/CommunityplatformModeratorModeration_logsController";
import { CommunityplatformModeratorPost_reportsController } from "./controllers/communityPlatform/moderator/post-reports/CommunityplatformModeratorPost_reportsController";
import { CommunityplatformModeratorPost_votesModeratorsController } from "./controllers/communityPlatform/moderator/post-votes/moderators/CommunityplatformModeratorPost_votesModeratorsController";
import { CommunityplatformModeratorPostsCommentsSortedController } from "./controllers/communityPlatform/moderator/posts/comments/sorted/CommunityplatformModeratorPostsCommentsSortedController";
import { CommunityplatformModeratorPostsSnapshotsController } from "./controllers/communityPlatform/moderator/posts/snapshots/CommunityplatformModeratorPostsSnapshotsController";
import { CommunityplatformModeratorReported_contentsDetailsController } from "./controllers/communityPlatform/moderator/reported-contents/details/CommunityplatformModeratorReported_contentsDetailsController";
import { CommunityplatformModeratorReportsController } from "./controllers/communityPlatform/moderator/reports/CommunityplatformModeratorReportsController";
import { CommunityplatformModeratorReportsPendingController } from "./controllers/communityPlatform/moderator/reports/pending/CommunityplatformModeratorReportsPendingController";
import { CommunityplatformModeratorReportsdecisionsController } from "./controllers/communityPlatform/moderator/reportsDecisions/CommunityplatformModeratorReportsdecisionsController";
import { CommunityplatformModeratorsController } from "./controllers/communityPlatform/moderators/CommunityplatformModeratorsController";
import { CommunityplatformPostsnapshotsController } from "./controllers/communityPlatform/postSnapshots/CommunityplatformPostsnapshotsController";
import { CommunityplatformReportreasonsController } from "./controllers/communityPlatform/reportReasons/CommunityplatformReportreasonsController";
import { CommunityplatformReportedcontentsController } from "./controllers/communityPlatform/reportedContents/CommunityplatformReportedcontentsController";
import { CommunityplatformReportsController } from "./controllers/communityPlatform/reports/CommunityplatformReportsController";
import { CommunityplatformUserComment_reportsController } from "./controllers/communityPlatform/user/comment-reports/CommunityplatformUserComment_reportsController";
import { CommunityplatformUserComment_votesUsersController } from "./controllers/communityPlatform/user/comment-votes/users/CommunityplatformUserComment_votesUsersController";
import { CommunityplatformUserCommentsController } from "./controllers/communityPlatform/user/comments/CommunityplatformUserCommentsController";
import { CommunityplatformUserCommentsSort_ordersController } from "./controllers/communityPlatform/user/comments/sort-orders/CommunityplatformUserCommentsSort_ordersController";
import { CommunityplatformUserCommentsVotesController } from "./controllers/communityPlatform/user/comments/votes/CommunityplatformUserCommentsVotesController";
import { CommunityplatformUserCommunitiesController } from "./controllers/communityPlatform/user/communities/CommunityplatformUserCommunitiesController";
import { CommunityplatformUserCommunitiesBrowseController } from "./controllers/communityPlatform/user/communities/browse/CommunityplatformUserCommunitiesBrowseController";
import { CommunityplatformUserCommunitiesPostsController } from "./controllers/communityPlatform/user/communities/posts/CommunityplatformUserCommunitiesPostsController";
import { CommunityplatformUserCommunity_subscriptionsController } from "./controllers/communityPlatform/user/community-subscriptions/CommunityplatformUserCommunity_subscriptionsController";
import { CommunityplatformUserEmail_verificationsController } from "./controllers/communityPlatform/user/email-verifications/CommunityplatformUserEmail_verificationsController";
import { CommunityplatformUserPassword_resetsController } from "./controllers/communityPlatform/user/password-resets/CommunityplatformUserPassword_resetsController";
import { CommunityplatformUserPost_reportsController } from "./controllers/communityPlatform/user/post-reports/CommunityplatformUserPost_reportsController";
import { CommunityplatformUserPost_votesController } from "./controllers/communityPlatform/user/post-votes/CommunityplatformUserPost_votesController";
import { CommunityplatformUserPost_votesUsersController } from "./controllers/communityPlatform/user/post-votes/users/CommunityplatformUserPost_votesUsersController";
import { CommunityplatformUserPostsController } from "./controllers/communityPlatform/user/posts/CommunityplatformUserPostsController";
import { CommunityplatformUserPostsCommentsController } from "./controllers/communityPlatform/user/posts/comments/CommunityplatformUserPostsCommentsController";
import { CommunityplatformUserPostsCommentsSortedController } from "./controllers/communityPlatform/user/posts/comments/sorted/CommunityplatformUserPostsCommentsSortedController";
import { CommunityplatformUserPostsFeedHomeController } from "./controllers/communityPlatform/user/posts/feed/home/CommunityplatformUserPostsFeedHomeController";
import { CommunityplatformUserPostsFeedPopularController } from "./controllers/communityPlatform/user/posts/feed/popular/CommunityplatformUserPostsFeedPopularController";
import { CommunityplatformUserPostsVoteController } from "./controllers/communityPlatform/user/posts/vote/CommunityplatformUserPostsVoteController";
import { CommunityplatformUserProfileController } from "./controllers/communityPlatform/user/profile/CommunityplatformUserProfileController";
import { CommunityplatformUserSubscriptionsController } from "./controllers/communityPlatform/user/subscriptions/CommunityplatformUserSubscriptionsController";
import { CommunityplatformUsersController } from "./controllers/communityPlatform/users/CommunityplatformUsersController";

@Module({
  controllers: [
    CommunityplatformAuthGuestController,
    CommunityplatformAuthUserController,
    CommunityplatformAuthModeratorController,
    CommunityplatformAuthAdminController,
    CommunityplatformGuestGuestsController,
    CommunityplatformGuestSessionsController,
    CommunityplatformUsersController,
    CommunityplatformUserProfileController,
    CommunityplatformUserPassword_resetsController,
    CommunityplatformUserEmail_verificationsController,
    CommunityplatformModeratorsController,
    CommunityplatformAdminsController,
    CommunityplatformCommunitiesController,
    CommunityplatformUserCommunitiesController,
    CommunityplatformUserCommunity_subscriptionsController,
    CommunityplatformUserPostsController,
    CommunityplatformModeratorCommunity_bansController,
    CommunityplatformUserPost_votesController,
    CommunityplatformUserPostsVoteController,
    CommunityplatformUserPost_votesUsersController,
    CommunityplatformModeratorPost_votesModeratorsController,
    CommunityplatformUserPostsCommentsController,
    CommunityplatformUserComment_votesUsersController,
    CommunityplatformModeratorComment_votesModeratorsController,
    CommunityplatformUserPost_reportsController,
    CommunityplatformModeratorPost_reportsController,
    CommunityplatformUserComment_reportsController,
    CommunityplatformModeratorComment_reportsController,
    CommunityplatformModeratorModeration_logsController,
    CommunityplatformAdminModeration_logsController,
    CommunityplatformUserCommentsController,
    CommunityplatformModeratorCommentsController,
    CommunityplatformAdminCommentsController,
    CommunityplatformUserCommentsVotesController,
    CommunityplatformModeratorCommentsVotesController,
    CommunityplatformAdminCommentsVotesController,
    CommunityplatformUserCommentsSort_ordersController,
    CommunityplatformModeratorCommentsSort_ordersController,
    CommunityplatformAdminCommentsSort_ordersController,
    CommunityplatformModeratorCommunity_banned_usersController,
    CommunityplatformAdminCommunity_banned_usersController,
    CommunityplatformModeratorCommunitymoderatorsController,
    CommunityplatformAdminCommunitymoderatorsController,
    CommunityplatformModeratorBannedusersController,
    CommunityplatformAdminBannedusersController,
    CommunityplatformModeratorReportsdecisionsController,
    CommunityplatformModeratorDeletedcontentsController,
    CommunityplatformReportsController,
    CommunityplatformReportreasonsController,
    CommunityplatformActivitylogsController,
    CommunityplatformPostsnapshotsController,
    CommunityplatformReportedcontentsController,
    CommunityplatformGuestCommunitiesBrowseController,
    CommunityplatformUserCommunitiesBrowseController,
    CommunityplatformUserSubscriptionsController,
    CommunityplatformUserPostsFeedHomeController,
    CommunityplatformGuestPostsFeedPopularController,
    CommunityplatformUserPostsFeedPopularController,
    CommunityplatformGuestCommunitiesPostsController,
    CommunityplatformUserCommunitiesPostsController,
    CommunityplatformModeratorCommunityBanned_usersController,
    CommunityplatformModeratorCommunityBanController,
    CommunityplatformModeratorCommunityReportsController,
    CommunityplatformModeratorCommunityReportsApproveController,
    CommunityplatformAdminAnalyticsPostsVotesController,
    CommunityplatformAdminAnalyticsCommunitiesSubscriptionsController,
    CommunityplatformModeratorReportsController,
    CommunityplatformAdminReportsController,
    CommunityplatformAdminAnalyticsModerationController,
    CommunityplatformModeratorCommunity_bansBatchController,
    CommunityplatformModeratorCommunity_bansBatchUnbanController,
    CommunityplatformGuestPostsCommentsSortedController,
    CommunityplatformUserPostsCommentsSortedController,
    CommunityplatformModeratorPostsCommentsSortedController,
    CommunityplatformAdminPostsCommentsSortedController,
    CommunityplatformModeratorCommunitiesBanned_usersController,
    CommunityplatformModeratorCommunitiesBanned_usersUnbanController,
    CommunityplatformModeratorCommentsVote_statsController,
    CommunityplatformAdminCommentsVote_statsController,
    CommunityplatformModeratorCommunitiesBansController,
    CommunityplatformAdminCommunitiesBansController,
    CommunityplatformModeratorReportsPendingController,
    CommunityplatformAdminReportsPendingController,
    CommunityplatformAdminActivity_logsAnalyticsController,
    CommunityplatformModeratorPostsSnapshotsController,
    CommunityplatformAdminPostsSnapshotsController,
    CommunityplatformModeratorReported_contentsDetailsController,
    CommunityplatformAdminReported_contentsDetailsController,
  ],
})
export class MyModule {}
