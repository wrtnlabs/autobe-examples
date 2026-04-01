import { Module } from "@nestjs/common";

import { RedditcommunityAuthGuestController } from "./controllers/redditCommunity/auth/guest/RedditcommunityAuthGuestController";
import { RedditcommunityAuthMemberController } from "./controllers/redditCommunity/auth/member/RedditcommunityAuthMemberController";
import { RedditcommunityCommentsVotesController } from "./controllers/redditCommunity/comments/votes/RedditcommunityCommentsVotesController";
import { RedditcommunityCommunitiesController } from "./controllers/redditCommunity/communities/RedditcommunityCommunitiesController";
import { RedditcommunityCommunitiesIconController } from "./controllers/redditCommunity/communities/icon/RedditcommunityCommunitiesIconController";
import { RedditcommunityGuestCommunitiesFeedController } from "./controllers/redditCommunity/guest/communities/feed/RedditcommunityGuestCommunitiesFeedController";
import { RedditcommunityGuestFeedsPopularController } from "./controllers/redditCommunity/guest/feeds/popular/RedditcommunityGuestFeedsPopularController";
import { RedditcommunityGuestMembersCommentsController } from "./controllers/redditCommunity/guest/members/comments/RedditcommunityGuestMembersCommentsController";
import { RedditcommunityGuestMembersPostsController } from "./controllers/redditCommunity/guest/members/posts/RedditcommunityGuestMembersPostsController";
import { RedditcommunityGuestMembersProfileController } from "./controllers/redditCommunity/guest/members/profile/RedditcommunityGuestMembersProfileController";
import { RedditcommunityGuestPostsController } from "./controllers/redditCommunity/guest/posts/RedditcommunityGuestPostsController";
import { RedditcommunityGuestPostsImagesController } from "./controllers/redditCommunity/guest/posts/images/RedditcommunityGuestPostsImagesController";
import { RedditcommunityGuestPostsSnapshotsController } from "./controllers/redditCommunity/guest/posts/snapshots/RedditcommunityGuestPostsSnapshotsController";
import { RedditcommunityMemberAvatarsController } from "./controllers/redditCommunity/member/avatars/RedditcommunityMemberAvatarsController";
import { RedditcommunityMemberCommentsReportsController } from "./controllers/redditCommunity/member/comments/reports/RedditcommunityMemberCommentsReportsController";
import { RedditcommunityMemberCommentsController } from "./controllers/redditCommunity/member/comments/vote/RedditcommunityMemberCommentsController";
import { RedditcommunityMemberComments_voteController } from "./controllers/redditCommunity/member/comments/vote/RedditcommunityMemberComments_voteController";
import { RedditcommunityMemberCommunitiesController } from "./controllers/redditCommunity/member/communities/RedditcommunityMemberCommunitiesController";
import { RedditcommunityMemberCommunitiesBansController } from "./controllers/redditCommunity/member/communities/bans/RedditcommunityMemberCommunitiesBansController";
import { RedditcommunityMemberCommunitiesComment_reportsController } from "./controllers/redditCommunity/member/communities/comment-reports/RedditcommunityMemberCommunitiesComment_reportsController";
import { RedditcommunityMemberCommunitiesFeedController } from "./controllers/redditCommunity/member/communities/feed/RedditcommunityMemberCommunitiesFeedController";
import { RedditcommunityMemberCommunitiesIconController } from "./controllers/redditCommunity/member/communities/icon/RedditcommunityMemberCommunitiesIconController";
import { RedditcommunityMemberCommunitiesModeratorsController } from "./controllers/redditCommunity/member/communities/moderators/RedditcommunityMemberCommunitiesModeratorsController";
import { RedditcommunityMemberCommunitiesReportsController } from "./controllers/redditCommunity/member/communities/reports/RedditcommunityMemberCommunitiesReportsController";
import { RedditcommunityMemberCommunitiesSubscriptionController } from "./controllers/redditCommunity/member/communities/subscription/RedditcommunityMemberCommunitiesSubscriptionController";
import { RedditcommunityMemberFeedsHomeController } from "./controllers/redditCommunity/member/feeds/home/RedditcommunityMemberFeedsHomeController";
import { RedditcommunityMemberFeedsPopularController } from "./controllers/redditCommunity/member/feeds/popular/RedditcommunityMemberFeedsPopularController";
import { RedditcommunityMemberKarma_historiesController } from "./controllers/redditCommunity/member/karma-histories/RedditcommunityMemberKarma_historiesController";
import { RedditcommunityMemberMembersCommentsController } from "./controllers/redditCommunity/member/members/comments/RedditcommunityMemberMembersCommentsController";
import { RedditcommunityMemberMembersPostsController } from "./controllers/redditCommunity/member/members/posts/RedditcommunityMemberMembersPostsController";
import { RedditcommunityMemberMembersProfileController } from "./controllers/redditCommunity/member/members/profile/RedditcommunityMemberMembersProfileController";
import { RedditcommunityMemberPostsController } from "./controllers/redditCommunity/member/posts/RedditcommunityMemberPostsController";
import { RedditcommunityMemberPostsCommentsController } from "./controllers/redditCommunity/member/posts/comments/RedditcommunityMemberPostsCommentsController";
import { RedditcommunityMemberPostsImagesController } from "./controllers/redditCommunity/member/posts/images/RedditcommunityMemberPostsImagesController";
import { RedditcommunityMemberPostsSnapshotsController } from "./controllers/redditCommunity/member/posts/snapshots/RedditcommunityMemberPostsSnapshotsController";
import { RedditcommunityMemberPostsVoteController } from "./controllers/redditCommunity/member/posts/vote/RedditcommunityMemberPostsVoteController";
import { RedditcommunityMemberProfileController } from "./controllers/redditCommunity/member/profile/RedditcommunityMemberProfileController";
import { RedditcommunityMemberSessionsController } from "./controllers/redditCommunity/member/sessions/RedditcommunityMemberSessionsController";
import { RedditcommunityMemberSubscriptionsController } from "./controllers/redditCommunity/member/subscriptions/RedditcommunityMemberSubscriptionsController";
import { RedditcommunityMembersController } from "./controllers/redditCommunity/members/RedditcommunityMembersController";
import { RedditcommunityPostsCommentsController } from "./controllers/redditCommunity/posts/comments/RedditcommunityPostsCommentsController";
import { RedditcommunityPostsVotesController } from "./controllers/redditCommunity/posts/votes/RedditcommunityPostsVotesController";
import { RedditcommunityProfilesController } from "./controllers/redditCommunity/profiles/RedditcommunityProfilesController";

@Module({
  controllers: [
    RedditcommunityAuthGuestController,
    RedditcommunityAuthMemberController,
    RedditcommunityMembersController,
    RedditcommunityMemberProfileController,
    RedditcommunityMemberSessionsController,
    RedditcommunityProfilesController,
    RedditcommunityMemberAvatarsController,
    RedditcommunityMemberKarma_historiesController,
    RedditcommunityCommunitiesController,
    RedditcommunityMemberCommunitiesController,
    RedditcommunityMemberSubscriptionsController,
    RedditcommunityMemberCommunitiesSubscriptionController,
    RedditcommunityMemberCommunitiesModeratorsController,
    RedditcommunityMemberCommunitiesBansController,
    RedditcommunityCommunitiesIconController,
    RedditcommunityMemberCommunitiesIconController,
    RedditcommunityGuestPostsController,
    RedditcommunityMemberPostsController,
    RedditcommunityGuestPostsImagesController,
    RedditcommunityMemberPostsImagesController,
    RedditcommunityGuestPostsSnapshotsController,
    RedditcommunityMemberPostsSnapshotsController,
    RedditcommunityPostsCommentsController,
    RedditcommunityMemberPostsCommentsController,
    RedditcommunityMemberCommentsReportsController,
    RedditcommunityPostsVotesController,
    RedditcommunityMemberPostsVoteController,
    RedditcommunityCommentsVotesController,
    RedditcommunityMemberComments_voteController,
    RedditcommunityMemberCommentsController,
    RedditcommunityGuestMembersProfileController,
    RedditcommunityMemberMembersProfileController,
    RedditcommunityGuestMembersPostsController,
    RedditcommunityMemberMembersPostsController,
    RedditcommunityGuestMembersCommentsController,
    RedditcommunityMemberMembersCommentsController,
    RedditcommunityMemberCommunitiesReportsController,
    RedditcommunityGuestFeedsPopularController,
    RedditcommunityMemberFeedsPopularController,
    RedditcommunityMemberFeedsHomeController,
    RedditcommunityGuestCommunitiesFeedController,
    RedditcommunityMemberCommunitiesFeedController,
    RedditcommunityMemberCommunitiesComment_reportsController,
  ],
})
export class MyModule {}
