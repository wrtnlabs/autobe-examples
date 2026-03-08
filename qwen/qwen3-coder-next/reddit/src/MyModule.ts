import { Module } from "@nestjs/common";

import { RedditlikeAdminAnalyticsDashboardController } from "./controllers/redditLike/admin/analytics/dashboard/RedditlikeAdminAnalyticsDashboardController";
import { RedditlikeAdminCommunitiesReportsController } from "./controllers/redditLike/admin/communities/reports/RedditlikeAdminCommunitiesReportsController";
import { RedditlikeAdminModerationActionsController } from "./controllers/redditLike/admin/moderation/actions/RedditlikeAdminModerationActionsController";
import { RedditlikeAdminModeratorsConductController } from "./controllers/redditLike/admin/moderators/conduct/RedditlikeAdminModeratorsConductController";
import { RedditlikeAdminSearchContentController } from "./controllers/redditLike/admin/search/content/RedditlikeAdminSearchContentController";
import { RedditlikeAdminUsersController } from "./controllers/redditLike/admin/users/RedditlikeAdminUsersController";
import { RedditlikeAdminsController } from "./controllers/redditLike/admins/RedditlikeAdminsController";
import { RedditlikeAuthAdminController } from "./controllers/redditLike/auth/admin/RedditlikeAuthAdminController";
import { RedditlikeAuthGuestController } from "./controllers/redditLike/auth/guest/RedditlikeAuthGuestController";
import { RedditlikeAuthMemberController } from "./controllers/redditLike/auth/member/RedditlikeAuthMemberController";
import { RedditlikeAuthModeratorController } from "./controllers/redditLike/auth/moderator/RedditlikeAuthModeratorController";
import { RedditlikeCommentsController } from "./controllers/redditLike/comments/RedditlikeCommentsController";
import { RedditlikeCommentsRevisionsController } from "./controllers/redditLike/comments/revisions/RedditlikeCommentsRevisionsController";
import { RedditlikeCommentsVotesController } from "./controllers/redditLike/comments/votes/summary/RedditlikeCommentsVotesController";
import { RedditlikeCommunitiesController } from "./controllers/redditLike/communities/RedditlikeCommunitiesController";
import { RedditlikeCommunitiesBanned_usersController } from "./controllers/redditLike/communities/banned-users/RedditlikeCommunitiesBanned_usersController";
import { RedditlikeCommunitiesModeratorsController } from "./controllers/redditLike/communities/moderators/RedditlikeCommunitiesModeratorsController";
import { RedditlikeCommunitiesPostsController } from "./controllers/redditLike/communities/posts/RedditlikeCommunitiesPostsController";
import { RedditlikeGuestCommunitiesFeedController } from "./controllers/redditLike/guest/communities/feed/RedditlikeGuestCommunitiesFeedController";
import { RedditlikeGuestFeedPopularController } from "./controllers/redditLike/guest/feed/popular/RedditlikeGuestFeedPopularController";
import { RedditlikeGuestsController } from "./controllers/redditLike/guests/RedditlikeGuestsController";
import { RedditlikeMemberActivityDashboardController } from "./controllers/redditLike/member/activity/dashboard/RedditlikeMemberActivityDashboardController";
import { RedditlikeMemberCommentsController } from "./controllers/redditLike/member/comments/RedditlikeMemberCommentsController";
import { RedditlikeMemberCommentsVoteController } from "./controllers/redditLike/member/comments/vote/RedditlikeMemberCommentsVoteController";
import { RedditlikeMemberCommunitiesController } from "./controllers/redditLike/member/communities/RedditlikeMemberCommunitiesController";
import { RedditlikeMemberCommunitiesBanController } from "./controllers/redditLike/member/communities/ban/RedditlikeMemberCommunitiesBanController";
import { RedditlikeMemberCommunitiesFeedController } from "./controllers/redditLike/member/communities/feed/RedditlikeMemberCommunitiesFeedController";
import { RedditlikeMemberCommunitiesModeratorsController } from "./controllers/redditLike/member/communities/moderators/RedditlikeMemberCommunitiesModeratorsController";
import { RedditlikeMemberCommunitiesSubscribeController } from "./controllers/redditLike/member/communities/subscribe/RedditlikeMemberCommunitiesSubscribeController";
import { RedditlikeMemberFeedHomeController } from "./controllers/redditLike/member/feed/home/RedditlikeMemberFeedHomeController";
import { RedditlikeMemberFeedPopularController } from "./controllers/redditLike/member/feed/popular/RedditlikeMemberFeedPopularController";
import { RedditlikeMemberKarmaController } from "./controllers/redditLike/member/karma/RedditlikeMemberKarmaController";
import { RedditlikeMemberPostsController } from "./controllers/redditLike/member/posts/RedditlikeMemberPostsController";
import { RedditlikeMemberPostsCommentsController } from "./controllers/redditLike/member/posts/comments/RedditlikeMemberPostsCommentsController";
import { RedditlikeMemberPostsVotesController } from "./controllers/redditLike/member/posts/votes/RedditlikeMemberPostsVotesController";
import { RedditlikeMemberReportsController } from "./controllers/redditLike/member/reports/RedditlikeMemberReportsController";
import { RedditlikeMemberSubscriptionsController } from "./controllers/redditLike/member/subscriptions/RedditlikeMemberSubscriptionsController";
import { RedditlikeMemberUsersController } from "./controllers/redditLike/member/users/RedditlikeMemberUsersController";
import { RedditlikeMemberUsersMeSubscribed_communitiesController } from "./controllers/redditLike/member/users/me/subscribed-communities/RedditlikeMemberUsersMeSubscribed_communitiesController";
import { RedditlikeMembersController } from "./controllers/redditLike/members/RedditlikeMembersController";
import { RedditlikeModeratorBansController } from "./controllers/redditLike/moderator/bans/RedditlikeModeratorBansController";
import { RedditlikeModeratorCommentsController } from "./controllers/redditLike/moderator/comments/RedditlikeModeratorCommentsController";
import { RedditlikeModeratorCommunitiesBansController } from "./controllers/redditLike/moderator/communities/bans/RedditlikeModeratorCommunitiesBansController";
import { RedditlikeModeratorCommunitiesReportsController } from "./controllers/redditLike/moderator/communities/reports/RedditlikeModeratorCommunitiesReportsController";
import { RedditlikeModeratorCommunitiesReviewController } from "./controllers/redditLike/moderator/communities/review/RedditlikeModeratorCommunitiesReviewController";
import { RedditlikeModeratorPostsController } from "./controllers/redditLike/moderator/posts/RedditlikeModeratorPostsController";
import { RedditlikeModeratorReportsController } from "./controllers/redditLike/moderator/reports/RedditlikeModeratorReportsController";
import { RedditlikeModeratorReportsModerator_actionController } from "./controllers/redditLike/moderator/reports/moderator-action/RedditlikeModeratorReportsModerator_actionController";
import { RedditlikeModeratorsController } from "./controllers/redditLike/moderators/RedditlikeModeratorsController";
import { RedditlikeController } from "./controllers/redditLike/popular/RedditlikeController";
import { RedditlikePostsController } from "./controllers/redditLike/posts/RedditlikePostsController";
import { RedditlikePostsCommentsController } from "./controllers/redditLike/posts/comments/RedditlikePostsCommentsController";
import { RedditlikePostsRevisionsController } from "./controllers/redditLike/posts/revisions/RedditlikePostsRevisionsController";
import { RedditlikePostsVotesController } from "./controllers/redditLike/posts/votes/summary/RedditlikePostsVotesController";
import { RedditlikeUsersController } from "./controllers/redditLike/users/RedditlikeUsersController";
import { RedditlikeUsersPostsController } from "./controllers/redditLike/users/posts/RedditlikeUsersPostsController";

@Module({
  controllers: [
    RedditlikeAuthGuestController,
    RedditlikeAuthMemberController,
    RedditlikeAuthModeratorController,
    RedditlikeAuthAdminController,
    RedditlikeMembersController,
    RedditlikeModeratorsController,
    RedditlikeCommunitiesModeratorsController,
    RedditlikeAdminsController,
    RedditlikeGuestsController,
    RedditlikeMemberUsersController,
    RedditlikeUsersController,
    RedditlikeAdminUsersController,
    RedditlikeCommunitiesController,
    RedditlikeMemberCommunitiesController,
    RedditlikeMemberCommunitiesSubscribeController,
    RedditlikeMemberUsersMeSubscribed_communitiesController,
    RedditlikeMemberCommunitiesModeratorsController,
    RedditlikeMemberCommunitiesBanController,
    RedditlikeCommunitiesBanned_usersController,
    RedditlikeMemberPostsController,
    RedditlikePostsController,
    RedditlikeModeratorPostsController,
    RedditlikePostsRevisionsController,
    RedditlikeMemberPostsCommentsController,
    RedditlikePostsCommentsController,
    RedditlikeMemberPostsVotesController,
    RedditlikeMemberCommentsVoteController,
    RedditlikePostsVotesController,
    RedditlikeCommentsVotesController,
    RedditlikeMemberCommentsController,
    RedditlikeModeratorCommentsController,
    RedditlikeCommentsRevisionsController,
    RedditlikeCommunitiesPostsController,
    RedditlikeUsersPostsController,
    RedditlikeCommentsController,
    RedditlikeModeratorReportsController,
    RedditlikeMemberReportsController,
    RedditlikeModeratorBansController,
    RedditlikeModeratorCommunitiesBansController,
    RedditlikeMemberSubscriptionsController,
    RedditlikeMemberKarmaController,
    RedditlikeMemberActivityDashboardController,
    RedditlikeMemberFeedHomeController,
    RedditlikeGuestFeedPopularController,
    RedditlikeMemberFeedPopularController,
    RedditlikeGuestCommunitiesFeedController,
    RedditlikeMemberCommunitiesFeedController,
    RedditlikeModeratorCommunitiesReportsController,
    RedditlikeAdminAnalyticsDashboardController,
    RedditlikeAdminSearchContentController,
    RedditlikeAdminCommunitiesReportsController,
    RedditlikeAdminModerationActionsController,
    RedditlikeAdminModeratorsConductController,
    RedditlikeModeratorCommunitiesReviewController,
    RedditlikeModeratorReportsModerator_actionController,
    RedditlikeController,
  ],
})
export class MyModule {}
