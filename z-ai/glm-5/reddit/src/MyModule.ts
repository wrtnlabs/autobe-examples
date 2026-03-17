import { Module } from "@nestjs/common";

import { CommunityplatformAuthGuestController } from "./controllers/communityPlatform/auth/guest/CommunityplatformAuthGuestController";
import { CommunityplatformAuthMemberController } from "./controllers/communityPlatform/auth/member/CommunityplatformAuthMemberController";
import { CommunityplatformCommunitiesController } from "./controllers/communityPlatform/communities/CommunityplatformCommunitiesController";
import { CommunityplatformCommunitiesPostsController } from "./controllers/communityPlatform/communities/posts/CommunityplatformCommunitiesPostsController";
import { CommunityplatformFilesController } from "./controllers/communityPlatform/files/CommunityplatformFilesController";
import { CommunityplatformMemberCommunitiesController } from "./controllers/communityPlatform/member/communities/CommunityplatformMemberCommunitiesController";
import { CommunityplatformMemberCommunitiesBansController } from "./controllers/communityPlatform/member/communities/bans/CommunityplatformMemberCommunitiesBansController";
import { CommunityplatformMemberCommunitiesCommentsController } from "./controllers/communityPlatform/member/communities/comments/CommunityplatformMemberCommunitiesCommentsController";
import { CommunityplatformMemberCommunitiesModeratorsController } from "./controllers/communityPlatform/member/communities/moderators/CommunityplatformMemberCommunitiesModeratorsController";
import { CommunityplatformMemberCommunitiesPostsController } from "./controllers/communityPlatform/member/communities/posts/CommunityplatformMemberCommunitiesPostsController";
import { CommunityplatformMemberCommunitiesReportsController } from "./controllers/communityPlatform/member/communities/reports/CommunityplatformMemberCommunitiesReportsController";
import { CommunityplatformMemberHomePostsController } from "./controllers/communityPlatform/member/home/posts/CommunityplatformMemberHomePostsController";
import { CommunityplatformMemberPostsController } from "./controllers/communityPlatform/member/posts/CommunityplatformMemberPostsController";
import { CommunityplatformMemberPostsCommentsController } from "./controllers/communityPlatform/member/posts/comments/CommunityplatformMemberPostsCommentsController";
import { CommunityplatformMemberPostsCommentsVoteController } from "./controllers/communityPlatform/member/posts/comments/vote/CommunityplatformMemberPostsCommentsVoteController";
import { CommunityplatformMemberPostsVoteController } from "./controllers/communityPlatform/member/posts/vote/CommunityplatformMemberPostsVoteController";
import { CommunityplatformMemberProfileController } from "./controllers/communityPlatform/member/profile/CommunityplatformMemberProfileController";
import { CommunityplatformMemberReportsController } from "./controllers/communityPlatform/member/reports/CommunityplatformMemberReportsController";
import { CommunityplatformMemberSessionsController } from "./controllers/communityPlatform/member/sessions/CommunityplatformMemberSessionsController";
import { CommunityplatformMemberVotesController } from "./controllers/communityPlatform/member/votes/CommunityplatformMemberVotesController";
import { CommunityplatformMembersController } from "./controllers/communityPlatform/members/CommunityplatformMembersController";
import { CommunityplatformPostsController } from "./controllers/communityPlatform/posts/CommunityplatformPostsController";
import { CommunityplatformPostsCommentsController } from "./controllers/communityPlatform/posts/comments/CommunityplatformPostsCommentsController";
import { CommunityplatformPostsCommentsVotesController } from "./controllers/communityPlatform/posts/comments/votes/CommunityplatformPostsCommentsVotesController";

@Module({
  controllers: [
    CommunityplatformAuthGuestController,
    CommunityplatformAuthMemberController,
    CommunityplatformMembersController,
    CommunityplatformMemberProfileController,
    CommunityplatformMemberSessionsController,
    CommunityplatformCommunitiesController,
    CommunityplatformMemberCommunitiesController,
    CommunityplatformMemberCommunitiesPostsController,
    CommunityplatformCommunitiesPostsController,
    CommunityplatformPostsController,
    CommunityplatformMemberPostsController,
    CommunityplatformMemberHomePostsController,
    CommunityplatformPostsCommentsController,
    CommunityplatformMemberPostsCommentsController,
    CommunityplatformPostsCommentsVotesController,
    CommunityplatformMemberPostsCommentsVoteController,
    CommunityplatformMemberVotesController,
    CommunityplatformFilesController,
    CommunityplatformMemberCommunitiesModeratorsController,
    CommunityplatformMemberCommunitiesBansController,
    CommunityplatformMemberCommunitiesReportsController,
    CommunityplatformMemberReportsController,
    CommunityplatformMemberCommunitiesCommentsController,
    CommunityplatformMemberPostsVoteController,
  ],
})
export class MyModule {}
