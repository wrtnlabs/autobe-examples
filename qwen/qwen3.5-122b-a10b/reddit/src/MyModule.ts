import { Module } from "@nestjs/common";

import { RedditplatformAuthGuestController } from "./controllers/redditPlatform/auth/guest/RedditplatformAuthGuestController";
import { RedditplatformAuthMemberController } from "./controllers/redditPlatform/auth/member/RedditplatformAuthMemberController";
import { RedditplatformCommunitiesController } from "./controllers/redditPlatform/communities/RedditplatformCommunitiesController";
import { RedditplatformCommunitiesModeratorsController } from "./controllers/redditPlatform/communities/moderators/RedditplatformCommunitiesModeratorsController";
import { RedditplatformCommunitiesPostsController } from "./controllers/redditPlatform/communities/posts/RedditplatformCommunitiesPostsController";
import { RedditplatformCommunitiesSearchController } from "./controllers/redditPlatform/communities/search/RedditplatformCommunitiesSearchController";
import { RedditplatformFeedsCommunityController } from "./controllers/redditPlatform/feeds/community/RedditplatformFeedsCommunityController";
import { RedditplatformFeedsPopularController } from "./controllers/redditPlatform/feeds/popular/RedditplatformFeedsPopularController";
import { RedditplatformMemberCommunitiesController } from "./controllers/redditPlatform/member/communities/RedditplatformMemberCommunitiesController";
import { RedditplatformMemberCommunitiesBansController } from "./controllers/redditPlatform/member/communities/bans/RedditplatformMemberCommunitiesBansController";
import { RedditplatformMemberCommunitiesModeratorsController } from "./controllers/redditPlatform/member/communities/moderators/RedditplatformMemberCommunitiesModeratorsController";
import { RedditplatformMemberCommunitiesReportsController } from "./controllers/redditPlatform/member/communities/reports/RedditplatformMemberCommunitiesReportsController";
import { RedditplatformMemberCommunitiesSubscriptionsController } from "./controllers/redditPlatform/member/communities/subscriptions/RedditplatformMemberCommunitiesSubscriptionsController";
import { RedditplatformMemberEmail_verificationsController } from "./controllers/redditPlatform/member/email-verifications/RedditplatformMemberEmail_verificationsController";
import { RedditplatformMemberFeedsHomeController } from "./controllers/redditPlatform/member/feeds/home/RedditplatformMemberFeedsHomeController";
import { RedditplatformMemberPassword_resetsController } from "./controllers/redditPlatform/member/password-resets/RedditplatformMemberPassword_resetsController";
import { RedditplatformMemberPostsController } from "./controllers/redditPlatform/member/posts/RedditplatformMemberPostsController";
import { RedditplatformMemberPostsCommentsController } from "./controllers/redditPlatform/member/posts/comments/RedditplatformMemberPostsCommentsController";
import { RedditplatformMemberPostsCommentsEdit_historiesController } from "./controllers/redditPlatform/member/posts/comments/edit-histories/RedditplatformMemberPostsCommentsEdit_historiesController";
import { RedditplatformMemberPostsCommentsVotesController } from "./controllers/redditPlatform/member/posts/comments/votes/RedditplatformMemberPostsCommentsVotesController";
import { RedditplatformMemberProfileController } from "./controllers/redditPlatform/member/profile/RedditplatformMemberProfileController";
import { RedditplatformMemberReportsController } from "./controllers/redditPlatform/member/reports/RedditplatformMemberReportsController";
import { RedditplatformMemberReportsSnapshotsController } from "./controllers/redditPlatform/member/reports/snapshots/RedditplatformMemberReportsSnapshotsController";
import { RedditplatformMemberSessionsController } from "./controllers/redditPlatform/member/sessions/RedditplatformMemberSessionsController";
import { RedditplatformMemberSubscriptionsController } from "./controllers/redditPlatform/member/subscriptions/RedditplatformMemberSubscriptionsController";
import { RedditplatformMembersController } from "./controllers/redditPlatform/members/RedditplatformMembersController";
import { RedditplatformPostsController } from "./controllers/redditPlatform/posts/RedditplatformPostsController";
import { RedditplatformPostsCommentsController } from "./controllers/redditPlatform/posts/comments/RedditplatformPostsCommentsController";
import { RedditplatformPostsSnapshotsController } from "./controllers/redditPlatform/posts/snapshots/RedditplatformPostsSnapshotsController";

@Module({
  controllers: [
    RedditplatformAuthGuestController,
    RedditplatformAuthMemberController,
    RedditplatformMembersController,
    RedditplatformMemberProfileController,
    RedditplatformMemberSessionsController,
    RedditplatformMemberPassword_resetsController,
    RedditplatformMemberEmail_verificationsController,
    RedditplatformCommunitiesController,
    RedditplatformMemberCommunitiesController,
    RedditplatformMemberSubscriptionsController,
    RedditplatformMemberCommunitiesSubscriptionsController,
    RedditplatformCommunitiesModeratorsController,
    RedditplatformMemberCommunitiesModeratorsController,
    RedditplatformMemberCommunitiesBansController,
    RedditplatformPostsController,
    RedditplatformMemberPostsController,
    RedditplatformPostsSnapshotsController,
    RedditplatformPostsCommentsController,
    RedditplatformMemberPostsCommentsController,
    RedditplatformMemberPostsCommentsVotesController,
    RedditplatformMemberPostsCommentsEdit_historiesController,
    RedditplatformMemberReportsController,
    RedditplatformMemberCommunitiesReportsController,
    RedditplatformMemberReportsSnapshotsController,
    RedditplatformCommunitiesSearchController,
    RedditplatformCommunitiesPostsController,
    RedditplatformMemberFeedsHomeController,
    RedditplatformFeedsPopularController,
    RedditplatformFeedsCommunityController,
  ],
})
export class MyModule {}
