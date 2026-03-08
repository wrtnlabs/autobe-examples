import { Module } from "@nestjs/common";

import { CommunityplatformAuthGuestController } from "./controllers/communityPlatform/auth/guest/CommunityplatformAuthGuestController";
import { CommunityplatformAuthMemberController } from "./controllers/communityPlatform/auth/member/CommunityplatformAuthMemberController";
import { CommunityplatformCommentsSnapshotsController } from "./controllers/communityPlatform/comments/snapshots/CommunityplatformCommentsSnapshotsController";
import { CommunityplatformCommunitiesController } from "./controllers/communityPlatform/communities/CommunityplatformCommunitiesController";
import { CommunityplatformCommunitiesFeedController } from "./controllers/communityPlatform/communities/feed/CommunityplatformCommunitiesFeedController";
import { CommunityplatformCommunitiesIconController } from "./controllers/communityPlatform/communities/icon/CommunityplatformCommunitiesIconController";
import { CommunityplatformCommunitiesModeratorsController } from "./controllers/communityPlatform/communities/moderators/CommunityplatformCommunitiesModeratorsController";
import { CommunityplatformFilesController } from "./controllers/communityPlatform/files/CommunityplatformFilesController";
import { CommunityplatformMemberAvatarController } from "./controllers/communityPlatform/member/avatar/CommunityplatformMemberAvatarController";
import { CommunityplatformMemberCommentsController } from "./controllers/communityPlatform/member/comments/CommunityplatformMemberCommentsController";
import { CommunityplatformMemberComments_voteController } from "./controllers/communityPlatform/member/comments/vote/CommunityplatformMemberComments_voteController";
import { CommunityplatformMemberCommunitiesController } from "./controllers/communityPlatform/member/communities/CommunityplatformMemberCommunitiesController";
import { CommunityplatformMemberCommunitiesBansController } from "./controllers/communityPlatform/member/communities/bans/CommunityplatformMemberCommunitiesBansController";
import { CommunityplatformMemberCommunitiesIconController } from "./controllers/communityPlatform/member/communities/icon/CommunityplatformMemberCommunitiesIconController";
import { CommunityplatformMemberCommunitiesModeratorsController } from "./controllers/communityPlatform/member/communities/moderators/CommunityplatformMemberCommunitiesModeratorsController";
import { CommunityplatformMemberHomeController } from "./controllers/communityPlatform/member/home/CommunityplatformMemberHomeController";
import { CommunityplatformMemberHome_feedController } from "./controllers/communityPlatform/member/home/feed/CommunityplatformMemberHome_feedController";
import { CommunityplatformMemberPostsController } from "./controllers/communityPlatform/member/posts/CommunityplatformMemberPostsController";
import { CommunityplatformMemberPostsCommentsController } from "./controllers/communityPlatform/member/posts/comments/CommunityplatformMemberPostsCommentsController";
import { CommunityplatformMemberPostsImagesController } from "./controllers/communityPlatform/member/posts/images/CommunityplatformMemberPostsImagesController";
import { CommunityplatformMemberPostsSnapshotsController } from "./controllers/communityPlatform/member/posts/snapshots/CommunityplatformMemberPostsSnapshotsController";
import { CommunityplatformMemberPostsVoteController } from "./controllers/communityPlatform/member/posts/vote/CommunityplatformMemberPostsVoteController";
import { CommunityplatformMemberProfileController } from "./controllers/communityPlatform/member/profile/CommunityplatformMemberProfileController";
import { CommunityplatformMemberReportsController } from "./controllers/communityPlatform/member/reports/CommunityplatformMemberReportsController";
import { CommunityplatformMemberSessionsController } from "./controllers/communityPlatform/member/sessions/CommunityplatformMemberSessionsController";
import { CommunityplatformMemberSubscriptionsController } from "./controllers/communityPlatform/member/subscriptions/CommunityplatformMemberSubscriptionsController";
import { CommunityplatformMembersController } from "./controllers/communityPlatform/members/CommunityplatformMembersController";
import { CommunityplatformMembersCommentsController } from "./controllers/communityPlatform/members/comments/CommunityplatformMembersCommentsController";
import { CommunityplatformPopularController } from "./controllers/communityPlatform/popular/CommunityplatformPopularController";
import { CommunityplatformPostsController } from "./controllers/communityPlatform/posts/CommunityplatformPostsController";
import { CommunityplatformPostsCommentsController } from "./controllers/communityPlatform/posts/comments/CommunityplatformPostsCommentsController";
import { CommunityplatformPostsImagesController } from "./controllers/communityPlatform/posts/images/CommunityplatformPostsImagesController";

@Module({
  controllers: [
    CommunityplatformAuthGuestController,
    CommunityplatformAuthMemberController,
    CommunityplatformMembersController,
    CommunityplatformMemberProfileController,
    CommunityplatformMemberSessionsController,
    CommunityplatformCommunitiesController,
    CommunityplatformMemberCommunitiesController,
    CommunityplatformCommunitiesModeratorsController,
    CommunityplatformMemberCommunitiesModeratorsController,
    CommunityplatformMemberCommunitiesBansController,
    CommunityplatformPostsController,
    CommunityplatformMemberPostsController,
    CommunityplatformMemberPostsSnapshotsController,
    CommunityplatformPostsCommentsController,
    CommunityplatformMemberPostsCommentsController,
    CommunityplatformCommentsSnapshotsController,
    CommunityplatformMemberPostsVoteController,
    CommunityplatformMemberComments_voteController,
    CommunityplatformMemberCommentsController,
    CommunityplatformMemberSubscriptionsController,
    CommunityplatformMemberReportsController,
    CommunityplatformMemberAvatarController,
    CommunityplatformMemberCommunitiesIconController,
    CommunityplatformCommunitiesIconController,
    CommunityplatformMemberPostsImagesController,
    CommunityplatformPostsImagesController,
    CommunityplatformFilesController,
    CommunityplatformMemberHome_feedController,
    CommunityplatformPopularController,
    CommunityplatformCommunitiesFeedController,
    CommunityplatformMembersCommentsController,
    CommunityplatformMemberHomeController,
  ],
})
export class MyModule {}
