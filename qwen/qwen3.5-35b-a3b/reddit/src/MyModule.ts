import { Module } from "@nestjs/common";

import { RedditplatformAuthGuestController } from "./controllers/redditPlatform/auth/guest/RedditplatformAuthGuestController";
import { RedditplatformAuthMemberController } from "./controllers/redditPlatform/auth/member/RedditplatformAuthMemberController";
import { RedditplatformComment_snapshotsController } from "./controllers/redditPlatform/comment-snapshots/RedditplatformComment_snapshotsController";
import { RedditplatformCommunitiesController } from "./controllers/redditPlatform/communities/RedditplatformCommunitiesController";
import { RedditplatformCommunitiesMembersController } from "./controllers/redditPlatform/communities/members/RedditplatformCommunitiesMembersController";
import { RedditplatformCommunitiesSnapshotsController } from "./controllers/redditPlatform/communities/snapshots/RedditplatformCommunitiesSnapshotsController";
import { RedditplatformCommunitiesSubscribersController } from "./controllers/redditPlatform/communities/subscribers/RedditplatformCommunitiesSubscribersController";
import { RedditplatformGuestCommentsController } from "./controllers/redditPlatform/guest/comments/replies/RedditplatformGuestCommentsController";
import { RedditplatformGuestCommentsVotesController } from "./controllers/redditPlatform/guest/comments/votes/totals/RedditplatformGuestCommentsVotesController";
import { RedditplatformGuestCommunitiesSearchController } from "./controllers/redditPlatform/guest/communities/search/RedditplatformGuestCommunitiesSearchController";
import { RedditplatformGuestFeedsCommunityController } from "./controllers/redditPlatform/guest/feeds/community/RedditplatformGuestFeedsCommunityController";
import { RedditplatformGuestFeedsPopularController } from "./controllers/redditPlatform/guest/feeds/popular/RedditplatformGuestFeedsPopularController";
import { RedditplatformGuestGuest_sessionsController } from "./controllers/redditPlatform/guest/guest-sessions/RedditplatformGuestGuest_sessionsController";
import { RedditplatformGuestPost_snapshotsController } from "./controllers/redditPlatform/guest/post-snapshots/RedditplatformGuestPost_snapshotsController";
import { RedditplatformGuestPostsController } from "./controllers/redditPlatform/guest/posts/RedditplatformGuestPostsController";
import { RedditplatformGuestPostsCommentsController } from "./controllers/redditPlatform/guest/posts/comments/sort/RedditplatformGuestPostsCommentsController";
import { RedditplatformGuestPostsMetricsController } from "./controllers/redditPlatform/guest/posts/metrics/RedditplatformGuestPostsMetricsController";
import { RedditplatformGuestSearchPostsController } from "./controllers/redditPlatform/guest/search/posts/RedditplatformGuestSearchPostsController";
import { RedditplatformGuestTrendingPostsController } from "./controllers/redditPlatform/guest/trending/posts/RedditplatformGuestTrendingPostsController";
import { RedditplatformGuestsController } from "./controllers/redditPlatform/guests/RedditplatformGuestsController";
import { RedditplatformMemberBan_snapshotsController } from "./controllers/redditPlatform/member/ban-snapshots/RedditplatformMemberBan_snapshotsController";
import { RedditplatformMemberBansController } from "./controllers/redditPlatform/member/bans/RedditplatformMemberBansController";
import { RedditplatformMemberCommentsController } from "./controllers/redditPlatform/member/comments/RedditplatformMemberCommentsController";
import { RedditplatformMemberCommentsVoteController } from "./controllers/redditPlatform/member/comments/vote/RedditplatformMemberCommentsVoteController";
import { RedditplatformMemberCommentsVotesController } from "./controllers/redditPlatform/member/comments/votes/totals/RedditplatformMemberCommentsVotesController";
import { RedditplatformMemberCommunitiesController } from "./controllers/redditPlatform/member/communities/RedditplatformMemberCommunitiesController";
import { RedditplatformMemberCommunitiesBansController } from "./controllers/redditPlatform/member/communities/bans/RedditplatformMemberCommunitiesBansController";
import { RedditplatformMemberCommunitiesModeratorsController } from "./controllers/redditPlatform/member/communities/moderators/RedditplatformMemberCommunitiesModeratorsController";
import { RedditplatformMemberCommunitiesReportsController } from "./controllers/redditPlatform/member/communities/reports/RedditplatformMemberCommunitiesReportsController";
import { RedditplatformMemberCommunitiesSearchController } from "./controllers/redditPlatform/member/communities/search/RedditplatformMemberCommunitiesSearchController";
import { RedditplatformMemberCommunitiesSnapshotsController } from "./controllers/redditPlatform/member/communities/snapshots/RedditplatformMemberCommunitiesSnapshotsController";
import { RedditplatformMemberCommunities_subscribeController } from "./controllers/redditPlatform/member/communities/subscribe/RedditplatformMemberCommunities_subscribeController";
import { RedditplatformMemberCommunitiesSubscribedController } from "./controllers/redditPlatform/member/communities/subscribed/RedditplatformMemberCommunitiesSubscribedController";
import { RedditplatformMemberEmail_verificationsController } from "./controllers/redditPlatform/member/email-verifications/RedditplatformMemberEmail_verificationsController";
import { RedditplatformMemberFeedsCommunityController } from "./controllers/redditPlatform/member/feeds/community/RedditplatformMemberFeedsCommunityController";
import { RedditplatformMemberFeedsHomeController } from "./controllers/redditPlatform/member/feeds/home/RedditplatformMemberFeedsHomeController";
import { RedditplatformMemberFeedsPopularController } from "./controllers/redditPlatform/member/feeds/popular/RedditplatformMemberFeedsPopularController";
import { RedditplatformMemberPassword_resetsController } from "./controllers/redditPlatform/member/password-resets/RedditplatformMemberPassword_resetsController";
import { RedditplatformMemberPost_snapshotsController } from "./controllers/redditPlatform/member/post-snapshots/RedditplatformMemberPost_snapshotsController";
import { RedditplatformMemberPostsController } from "./controllers/redditPlatform/member/posts/RedditplatformMemberPostsController";
import { RedditplatformMemberPostsCommentsController } from "./controllers/redditPlatform/member/posts/comments/sort/RedditplatformMemberPostsCommentsController";
import { RedditplatformMemberPostsMetricsController } from "./controllers/redditPlatform/member/posts/metrics/RedditplatformMemberPostsMetricsController";
import { RedditplatformMemberPosts_voteController } from "./controllers/redditPlatform/member/posts/vote/RedditplatformMemberPosts_voteController";
import { RedditplatformMemberProfileController } from "./controllers/redditPlatform/member/profile/RedditplatformMemberProfileController";
import { RedditplatformMemberReportsController } from "./controllers/redditPlatform/member/reports/RedditplatformMemberReportsController";
import { RedditplatformMemberSearchPostsController } from "./controllers/redditPlatform/member/search/posts/RedditplatformMemberSearchPostsController";
import { RedditplatformMemberSessionsController } from "./controllers/redditPlatform/member/sessions/RedditplatformMemberSessionsController";
import { RedditplatformMemberSubscribedController } from "./controllers/redditPlatform/member/subscribed/RedditplatformMemberSubscribedController";
import { RedditplatformMemberSubscriptionsController } from "./controllers/redditPlatform/member/subscriptions/RedditplatformMemberSubscriptionsController";
import { RedditplatformMemberTrendingPostsController } from "./controllers/redditPlatform/member/trending/posts/RedditplatformMemberTrendingPostsController";
import { RedditplatformMemberUsersActivityController } from "./controllers/redditPlatform/member/users/activity/RedditplatformMemberUsersActivityController";
import { RedditplatformMemberUsersMeActivityController } from "./controllers/redditPlatform/member/users/me/activity/RedditplatformMemberUsersMeActivityController";
import { RedditplatformMemberUsersMeCommentsController } from "./controllers/redditPlatform/member/users/me/comments/RedditplatformMemberUsersMeCommentsController";
import { RedditplatformMemberUsersMeController } from "./controllers/redditPlatform/member/users/me/stats/RedditplatformMemberUsersMeController";
import { RedditplatformMemberUsersController } from "./controllers/redditPlatform/member/users/stats/RedditplatformMemberUsersController";
import { RedditplatformMemberUsersSubscribed_communitiesController } from "./controllers/redditPlatform/member/users/subscribed-communities/RedditplatformMemberUsersSubscribed_communitiesController";
import { RedditplatformMembersController } from "./controllers/redditPlatform/members/RedditplatformMembersController";
import { RedditplatformPostsCommentsController } from "./controllers/redditPlatform/posts/comments/RedditplatformPostsCommentsController";
import { RedditplatformUsersController } from "./controllers/redditPlatform/users/RedditplatformUsersController";

@Module({
  controllers: [
    RedditplatformAuthGuestController,
    RedditplatformAuthMemberController,
    RedditplatformMembersController,
    RedditplatformMemberProfileController,
    RedditplatformGuestsController,
    RedditplatformMemberSessionsController,
    RedditplatformGuestGuest_sessionsController,
    RedditplatformMemberPassword_resetsController,
    RedditplatformMemberEmail_verificationsController,
    RedditplatformUsersController,
    RedditplatformCommunitiesController,
    RedditplatformMemberCommunitiesController,
    RedditplatformCommunitiesMembersController,
    RedditplatformCommunitiesSnapshotsController,
    RedditplatformMemberCommunitiesSnapshotsController,
    RedditplatformMemberSubscriptionsController,
    RedditplatformMemberSubscribedController,
    RedditplatformMemberFeedsHomeController,
    RedditplatformGuestFeedsPopularController,
    RedditplatformMemberFeedsPopularController,
    RedditplatformGuestFeedsCommunityController,
    RedditplatformMemberFeedsCommunityController,
    RedditplatformGuestPostsController,
    RedditplatformMemberPostsController,
    RedditplatformGuestPost_snapshotsController,
    RedditplatformMemberPost_snapshotsController,
    RedditplatformPostsCommentsController,
    RedditplatformMemberCommentsController,
    RedditplatformComment_snapshotsController,
    RedditplatformMemberPosts_voteController,
    RedditplatformMemberCommentsVoteController,
    RedditplatformMemberReportsController,
    RedditplatformMemberBansController,
    RedditplatformMemberCommunitiesBansController,
    RedditplatformMemberBan_snapshotsController,
    RedditplatformMemberUsersController,
    RedditplatformMemberUsersActivityController,
    RedditplatformMemberUsersMeController,
    RedditplatformMemberUsersMeActivityController,
    RedditplatformGuestCommunitiesSearchController,
    RedditplatformMemberCommunitiesSearchController,
    RedditplatformMemberCommunitiesSubscribedController,
    RedditplatformMemberCommunitiesModeratorsController,
    RedditplatformMemberCommunities_subscribeController,
    RedditplatformCommunitiesSubscribersController,
    RedditplatformMemberUsersSubscribed_communitiesController,
    RedditplatformGuestPostsMetricsController,
    RedditplatformMemberPostsMetricsController,
    RedditplatformGuestSearchPostsController,
    RedditplatformMemberSearchPostsController,
    RedditplatformGuestTrendingPostsController,
    RedditplatformMemberTrendingPostsController,
    RedditplatformGuestPostsCommentsController,
    RedditplatformMemberPostsCommentsController,
    RedditplatformMemberUsersMeCommentsController,
    RedditplatformGuestCommentsController,
    RedditplatformGuestCommentsVotesController,
    RedditplatformMemberCommentsVotesController,
    RedditplatformMemberCommunitiesReportsController,
  ],
})
export class MyModule {}
