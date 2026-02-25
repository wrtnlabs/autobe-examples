import { Module } from "@nestjs/common";

import { CommunityAuthMemberController } from "./controllers/community/auth/member/CommunityAuthMemberController";
import { CommunityCommentsController } from "./controllers/community/comments/CommunityCommentsController";
import { CommunityCommunitiesController } from "./controllers/community/communities/CommunityCommunitiesController";
import { CommunityCommunitiesModeratorsController } from "./controllers/community/communities/moderators/CommunityCommunitiesModeratorsController";
import { CommunityCommunities_newController } from "./controllers/community/communities/new/CommunityCommunities_newController";
import { CommunityCommunitiesPostsController } from "./controllers/community/communities/posts/CommunityCommunitiesPostsController";
import { CommunityFeedsPopularController } from "./controllers/community/feeds/popular/CommunityFeedsPopularController";
import { CommunityMemberCommentsController } from "./controllers/community/member/comments/CommunityMemberCommentsController";
import { CommunityMemberCommentsRepliesController } from "./controllers/community/member/comments/replies/CommunityMemberCommentsRepliesController";
import { CommunityMemberComments_voteController } from "./controllers/community/member/comments/vote/CommunityMemberComments_voteController";
import { CommunityMemberCommentsVotesController } from "./controllers/community/member/comments/votes/CommunityMemberCommentsVotesController";
import { CommunityMemberCommentsVotesMyController } from "./controllers/community/member/comments/votes/my/CommunityMemberCommentsVotesMyController";
import { CommunityMemberCommunitiesController } from "./controllers/community/member/communities/CommunityMemberCommunitiesController";
import { CommunityMemberCommunitiesBansController } from "./controllers/community/member/communities/bans/CommunityMemberCommunitiesBansController";
import { CommunityMemberCommunitiesModerationlogsController } from "./controllers/community/member/communities/moderationLogs/CommunityMemberCommunitiesModerationlogsController";
import { CommunityMemberCommunitiesModeratorsController } from "./controllers/community/member/communities/moderators/CommunityMemberCommunitiesModeratorsController";
import { CommunityMemberCommunitiesPostsController } from "./controllers/community/member/communities/posts/CommunityMemberCommunitiesPostsController";
import { CommunityMemberCommunitiesReportsController } from "./controllers/community/member/communities/reports/CommunityMemberCommunitiesReportsController";
import { CommunityMemberCommunities_subscribeController } from "./controllers/community/member/communities/subscribe/CommunityMemberCommunities_subscribeController";
import { CommunityMemberCommunitiesSubscriptionsController } from "./controllers/community/member/communities/subscriptions/CommunityMemberCommunitiesSubscriptionsController";
import { CommunityMemberFeedsHomeController } from "./controllers/community/member/feeds/home/CommunityMemberFeedsHomeController";
import { CommunityMemberFilesController } from "./controllers/community/member/files/CommunityMemberFilesController";
import { CommunityMemberMemberReportsController } from "./controllers/community/member/member/reports/CommunityMemberMemberReportsController";
import { CommunityMemberPostsController } from "./controllers/community/member/posts/CommunityMemberPostsController";
import { CommunityMemberPostsCommentsController } from "./controllers/community/member/posts/comments/CommunityMemberPostsCommentsController";
import { CommunityMemberPosts_voteController } from "./controllers/community/member/posts/vote/CommunityMemberPosts_voteController";
import { CommunityMemberPostsVotesController } from "./controllers/community/member/posts/votes/CommunityMemberPostsVotesController";
import { CommunityMemberProfileController } from "./controllers/community/member/profile/CommunityMemberProfileController";
import { CommunityMemberReportsController } from "./controllers/community/member/reports/CommunityMemberReportsController";
import { CommunityMemberReports_resolutionController } from "./controllers/community/member/reports/resolution/CommunityMemberReports_resolutionController";
import { CommunityMemberSessionsController } from "./controllers/community/member/sessions/CommunityMemberSessionsController";
import { CommunityMemberSubscriptionsController } from "./controllers/community/member/subscriptions/CommunityMemberSubscriptionsController";
import { CommunityMembersController } from "./controllers/community/members/CommunityMembersController";
import { CommunityMembersCommentsController } from "./controllers/community/members/comments/CommunityMembersCommentsController";
import { CommunityMembersPostsController } from "./controllers/community/members/posts/CommunityMembersPostsController";
import { CommunityPost_snapshotsController } from "./controllers/community/post-snapshots/CommunityPost_snapshotsController";
import { CommunityPostsController } from "./controllers/community/posts/CommunityPostsController";
import { CommunityPostsCommentsController } from "./controllers/community/posts/comments/CommunityPostsCommentsController";

@Module({
  controllers: [
    CommunityAuthMemberController,
    CommunityMembersController,
    CommunityMemberProfileController,
    CommunityMemberSessionsController,
    CommunityMembersPostsController,
    CommunityMembersCommentsController,
    CommunityCommunitiesController,
    CommunityMemberCommunitiesController,
    CommunityMemberSubscriptionsController,
    CommunityMemberFilesController,
    CommunityMemberCommunitiesSubscriptionsController,
    CommunityMemberCommunities_subscribeController,
    CommunityPostsController,
    CommunityMemberCommunitiesPostsController,
    CommunityMemberPostsController,
    CommunityMemberPostsVotesController,
    CommunityPost_snapshotsController,
    CommunityMemberFeedsHomeController,
    CommunityFeedsPopularController,
    CommunityCommunitiesPostsController,
    CommunityMemberPostsCommentsController,
    CommunityMemberCommentsRepliesController,
    CommunityPostsCommentsController,
    CommunityCommentsController,
    CommunityMemberCommentsController,
    CommunityMemberCommentsVotesController,
    CommunityMemberCommentsVotesMyController,
    CommunityMemberPosts_voteController,
    CommunityMemberComments_voteController,
    CommunityCommunitiesModeratorsController,
    CommunityMemberCommunitiesModeratorsController,
    CommunityMemberCommunitiesBansController,
    CommunityMemberCommunitiesModerationlogsController,
    CommunityMemberReportsController,
    CommunityMemberReports_resolutionController,
    CommunityMemberMemberReportsController,
    CommunityCommunities_newController,
    CommunityMemberCommunitiesReportsController,
  ],
})
export class MyModule {}
