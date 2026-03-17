import { Module } from "@nestjs/common";

import { RedditcloneAuthGuestController } from "./controllers/redditClone/auth/guest/RedditcloneAuthGuestController";
import { RedditcloneAuthMemberController } from "./controllers/redditClone/auth/member/RedditcloneAuthMemberController";
import { RedditcloneCommunitiesController } from "./controllers/redditClone/communities/RedditcloneCommunitiesController";
import { RedditcloneCommunitiesFeedController } from "./controllers/redditClone/communities/feed/RedditcloneCommunitiesFeedController";
import { RedditcloneFeedsPopularController } from "./controllers/redditClone/feeds/popular/RedditcloneFeedsPopularController";
import { RedditcloneGuestMembersCommentsController } from "./controllers/redditClone/guest/members/comments/RedditcloneGuestMembersCommentsController";
import { RedditcloneGuestMembersPostsController } from "./controllers/redditClone/guest/members/posts/RedditcloneGuestMembersPostsController";
import { RedditcloneKarma_scoresController } from "./controllers/redditClone/karma-scores/RedditcloneKarma_scoresController";
import { RedditcloneKarma_scoresChangesController } from "./controllers/redditClone/karma-scores/changes/RedditcloneKarma_scoresChangesController";
import { RedditcloneMemberCommentsVoteController } from "./controllers/redditClone/member/comments/vote/RedditcloneMemberCommentsVoteController";
import { RedditcloneMemberCommentsVotesController } from "./controllers/redditClone/member/comments/votes/RedditcloneMemberCommentsVotesController";
import { RedditcloneMemberCommunitiesBansController } from "./controllers/redditClone/member/communities/bans/RedditcloneMemberCommunitiesBansController";
import { RedditcloneMemberCommunitiesModeratorsController } from "./controllers/redditClone/member/communities/moderators/RedditcloneMemberCommunitiesModeratorsController";
import { RedditcloneMemberCommunitiesReportsController } from "./controllers/redditClone/member/communities/reports/RedditcloneMemberCommunitiesReportsController";
import { RedditcloneMemberCommunitiesReportsActionsController } from "./controllers/redditClone/member/communities/reports/actions/RedditcloneMemberCommunitiesReportsActionsController";
import { RedditcloneMemberFeedsHomeController } from "./controllers/redditClone/member/feeds/home/RedditcloneMemberFeedsHomeController";
import { RedditcloneMemberMembersCommentsController } from "./controllers/redditClone/member/members/comments/RedditcloneMemberMembersCommentsController";
import { RedditcloneMemberMembersPostsController } from "./controllers/redditClone/member/members/posts/RedditcloneMemberMembersPostsController";
import { RedditcloneMemberPostsController } from "./controllers/redditClone/member/posts/RedditcloneMemberPostsController";
import { RedditcloneMemberPostsCommentsController } from "./controllers/redditClone/member/posts/comments/RedditcloneMemberPostsCommentsController";
import { RedditcloneMemberPostsCommentsSnapshotsController } from "./controllers/redditClone/member/posts/comments/snapshots/RedditcloneMemberPostsCommentsSnapshotsController";
import { RedditcloneMemberPostsSnapshotsController } from "./controllers/redditClone/member/posts/snapshots/RedditcloneMemberPostsSnapshotsController";
import { RedditcloneMemberPosts_voteController } from "./controllers/redditClone/member/posts/vote/RedditcloneMemberPosts_voteController";
import { RedditcloneMemberPostsVotesController } from "./controllers/redditClone/member/posts/votes/RedditcloneMemberPostsVotesController";
import { RedditcloneMemberProfileController } from "./controllers/redditClone/member/profile/RedditcloneMemberProfileController";
import { RedditcloneMemberSessionsController } from "./controllers/redditClone/member/sessions/RedditcloneMemberSessionsController";
import { RedditcloneMemberSubscribedController } from "./controllers/redditClone/member/subscribed/RedditcloneMemberSubscribedController";
import { RedditcloneMemberSubscriptionsController } from "./controllers/redditClone/member/subscriptions/RedditcloneMemberSubscriptionsController";
import { RedditcloneMembersController } from "./controllers/redditClone/members/RedditcloneMembersController";
import { RedditcloneMembersCommentsController } from "./controllers/redditClone/members/comments/RedditcloneMembersCommentsController";
import { RedditcloneMembersPostsController } from "./controllers/redditClone/members/posts/RedditcloneMembersPostsController";
import { RedditclonePostsController } from "./controllers/redditClone/posts/RedditclonePostsController";
import { RedditclonePostsCommentsController } from "./controllers/redditClone/posts/comments/RedditclonePostsCommentsController";
import { RedditcloneProfilesController } from "./controllers/redditClone/profiles/RedditcloneProfilesController";

@Module({
  controllers: [
    RedditcloneAuthGuestController,
    RedditcloneAuthMemberController,
    RedditcloneMemberProfileController,
    RedditcloneMemberSessionsController,
    RedditcloneMembersController,
    RedditcloneProfilesController,
    RedditcloneKarma_scoresController,
    RedditcloneKarma_scoresChangesController,
    RedditcloneCommunitiesController,
    RedditcloneMemberSubscriptionsController,
    RedditclonePostsController,
    RedditcloneMemberPostsController,
    RedditcloneMemberPostsSnapshotsController,
    RedditclonePostsCommentsController,
    RedditcloneMemberPostsCommentsController,
    RedditcloneMemberPostsCommentsSnapshotsController,
    RedditcloneMemberPostsVotesController,
    RedditcloneMemberPosts_voteController,
    RedditcloneMemberCommentsVotesController,
    RedditcloneMemberCommentsVoteController,
    RedditcloneMemberCommunitiesModeratorsController,
    RedditcloneMemberCommunitiesBansController,
    RedditcloneMemberCommunitiesReportsController,
    RedditcloneMemberCommunitiesReportsActionsController,
    RedditcloneGuestMembersPostsController,
    RedditcloneMemberMembersPostsController,
    RedditcloneGuestMembersCommentsController,
    RedditcloneMemberMembersCommentsController,
    RedditcloneMemberSubscribedController,
    RedditcloneMemberFeedsHomeController,
    RedditcloneFeedsPopularController,
    RedditcloneCommunitiesFeedController,
    RedditcloneMembersPostsController,
    RedditcloneMembersCommentsController,
  ],
})
export class MyModule {}
