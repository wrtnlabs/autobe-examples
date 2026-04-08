import { Module } from "@nestjs/common";

import { RedditcommunityAuthGuestController } from "./controllers/redditCommunity/auth/guest/RedditcommunityAuthGuestController";
import { RedditcommunityAuthMemberController } from "./controllers/redditCommunity/auth/member/RedditcommunityAuthMemberController";
import { RedditcommunityCommunitiesController } from "./controllers/redditCommunity/communities/RedditcommunityCommunitiesController";
import { RedditcommunityFeedsCommunityController } from "./controllers/redditCommunity/feeds/community/RedditcommunityFeedsCommunityController";
import { RedditcommunityFeedsPopularController } from "./controllers/redditCommunity/feeds/popular/RedditcommunityFeedsPopularController";
import { RedditcommunityGuestMembersCommentsController } from "./controllers/redditCommunity/guest/members/comments/RedditcommunityGuestMembersCommentsController";
import { RedditcommunityGuestMembersPostsController } from "./controllers/redditCommunity/guest/members/posts/RedditcommunityGuestMembersPostsController";
import { RedditcommunityGuestSessionsController } from "./controllers/redditCommunity/guest/sessions/RedditcommunityGuestSessionsController";
import { RedditcommunityGuestsController } from "./controllers/redditCommunity/guests/RedditcommunityGuestsController";
import { RedditcommunityMemberCommentsVotesController } from "./controllers/redditCommunity/member/comments/votes/RedditcommunityMemberCommentsVotesController";
import { RedditcommunityMemberCommunitiesController } from "./controllers/redditCommunity/member/communities/RedditcommunityMemberCommunitiesController";
import { RedditcommunityMemberCommunitiesBansController } from "./controllers/redditCommunity/member/communities/bans/RedditcommunityMemberCommunitiesBansController";
import { RedditcommunityMemberCommunitiesModeratorsController } from "./controllers/redditCommunity/member/communities/moderators/RedditcommunityMemberCommunitiesModeratorsController";
import { RedditcommunityMemberCommunitiesReportsController } from "./controllers/redditCommunity/member/communities/reports/RedditcommunityMemberCommunitiesReportsController";
import { RedditcommunityMemberCommunitiesReportsPendingController } from "./controllers/redditCommunity/member/communities/reports/pending/RedditcommunityMemberCommunitiesReportsPendingController";
import { RedditcommunityMemberFeedHomeController } from "./controllers/redditCommunity/member/feed/home/RedditcommunityMemberFeedHomeController";
import { RedditcommunityMemberMemberSubscriptionsController } from "./controllers/redditCommunity/member/member/subscriptions/RedditcommunityMemberMemberSubscriptionsController";
import { RedditcommunityMemberMembersCommentsController } from "./controllers/redditCommunity/member/members/comments/RedditcommunityMemberMembersCommentsController";
import { RedditcommunityMemberMembersPostsController } from "./controllers/redditCommunity/member/members/posts/RedditcommunityMemberMembersPostsController";
import { RedditcommunityMemberPostsCommentsController } from "./controllers/redditCommunity/member/posts/comments/RedditcommunityMemberPostsCommentsController";
import { RedditcommunityMemberPostsVotesController } from "./controllers/redditCommunity/member/posts/votes/RedditcommunityMemberPostsVotesController";
import { RedditcommunityMemberProfileController } from "./controllers/redditCommunity/member/profile/RedditcommunityMemberProfileController";
import { RedditcommunityMemberReportsController } from "./controllers/redditCommunity/member/reports/RedditcommunityMemberReportsController";
import { RedditcommunityMemberSubscribed_communitiesController } from "./controllers/redditCommunity/member/subscribed-communities/RedditcommunityMemberSubscribed_communitiesController";
import { RedditcommunityMembersController } from "./controllers/redditCommunity/members/RedditcommunityMembersController";
import { RedditcommunityPostsController } from "./controllers/redditCommunity/posts/RedditcommunityPostsController";
import { RedditcommunityPostsCommentsController } from "./controllers/redditCommunity/posts/comments/RedditcommunityPostsCommentsController";

@Module({
  controllers: [
    RedditcommunityAuthGuestController,
    RedditcommunityAuthMemberController,
    RedditcommunityGuestsController,
    RedditcommunityMembersController,
    RedditcommunityMemberProfileController,
    RedditcommunityGuestSessionsController,
    RedditcommunityCommunitiesController,
    RedditcommunityMemberCommunitiesController,
    RedditcommunityMemberMemberSubscriptionsController,
    RedditcommunityPostsController,
    RedditcommunityMemberPostsVotesController,
    RedditcommunityPostsCommentsController,
    RedditcommunityMemberPostsCommentsController,
    RedditcommunityMemberCommentsVotesController,
    RedditcommunityMemberCommunitiesModeratorsController,
    RedditcommunityMemberCommunitiesBansController,
    RedditcommunityMemberReportsController,
    RedditcommunityGuestMembersPostsController,
    RedditcommunityMemberMembersPostsController,
    RedditcommunityGuestMembersCommentsController,
    RedditcommunityMemberMembersCommentsController,
    RedditcommunityMemberSubscribed_communitiesController,
    RedditcommunityMemberFeedHomeController,
    RedditcommunityFeedsPopularController,
    RedditcommunityFeedsCommunityController,
    RedditcommunityMemberCommunitiesReportsPendingController,
    RedditcommunityMemberCommunitiesReportsController,
  ],
})
export class MyModule {}
