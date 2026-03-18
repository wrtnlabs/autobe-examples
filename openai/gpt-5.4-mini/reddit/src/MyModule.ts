import { Module } from "@nestjs/common";

import { CommunityplatformAdminAdminsController } from "./controllers/communityPlatform/admin/admins/CommunityplatformAdminAdminsController";
import { CommunityplatformAdminCommentsController } from "./controllers/communityPlatform/admin/comments/CommunityplatformAdminCommentsController";
import { CommunityplatformAdminCommunitiesController } from "./controllers/communityPlatform/admin/communities/CommunityplatformAdminCommunitiesController";
import { CommunityplatformAdminCommunitiesBansController } from "./controllers/communityPlatform/admin/communities/bans/CommunityplatformAdminCommunitiesBansController";
import { CommunityplatformAdminCommunitiesModerationrolesController } from "./controllers/communityPlatform/admin/communities/moderationRoles/CommunityplatformAdminCommunitiesModerationrolesController";
import { CommunityplatformAdminCommunitiesReportsController } from "./controllers/communityPlatform/admin/communities/reports/CommunityplatformAdminCommunitiesReportsController";
import { CommunityplatformAdminPassword_resetsController } from "./controllers/communityPlatform/admin/password-resets/CommunityplatformAdminPassword_resetsController";
import { CommunityplatformAdminPostsController } from "./controllers/communityPlatform/admin/posts/CommunityplatformAdminPostsController";
import { CommunityplatformAdminReportsController } from "./controllers/communityPlatform/admin/reports/CommunityplatformAdminReportsController";
import { CommunityplatformAuthAdminController } from "./controllers/communityPlatform/auth/admin/CommunityplatformAuthAdminController";
import { CommunityplatformAuthGuestController } from "./controllers/communityPlatform/auth/guest/CommunityplatformAuthGuestController";
import { CommunityplatformAuthMemberController } from "./controllers/communityPlatform/auth/member/CommunityplatformAuthMemberController";
import { CommunityplatformCommunitiesController } from "./controllers/communityPlatform/communities/CommunityplatformCommunitiesController";
import { CommunityplatformGuestCommentsController } from "./controllers/communityPlatform/guest/comments/CommunityplatformGuestCommentsController";
import { CommunityplatformGuestCommunitiesController } from "./controllers/communityPlatform/guest/communities/CommunityplatformGuestCommunitiesController";
import { CommunityplatformGuestPostsController } from "./controllers/communityPlatform/guest/posts/CommunityplatformGuestPostsController";
import { CommunityplatformGuestSessionsController } from "./controllers/communityPlatform/guest/sessions/CommunityplatformGuestSessionsController";
import { CommunityplatformMemberCommentsController } from "./controllers/communityPlatform/member/comments/CommunityplatformMemberCommentsController";
import { CommunityplatformMemberCommentsVoteController } from "./controllers/communityPlatform/member/comments/vote/CommunityplatformMemberCommentsVoteController";
import { CommunityplatformMemberCommentsVotesController } from "./controllers/communityPlatform/member/comments/votes/CommunityplatformMemberCommentsVotesController";
import { CommunityplatformMemberCommunitiesController } from "./controllers/communityPlatform/member/communities/CommunityplatformMemberCommunitiesController";
import { CommunityplatformMemberCommunitiesBansController } from "./controllers/communityPlatform/member/communities/bans/CommunityplatformMemberCommunitiesBansController";
import { CommunityplatformMemberCommunitiesModerationrolesController } from "./controllers/communityPlatform/member/communities/moderationRoles/CommunityplatformMemberCommunitiesModerationrolesController";
import { CommunityplatformMemberCommunitiesSubscribedController } from "./controllers/communityPlatform/member/communities/subscribed/CommunityplatformMemberCommunitiesSubscribedController";
import { CommunityplatformMemberCommunitiesSubscriptionsController } from "./controllers/communityPlatform/member/communities/subscriptions/CommunityplatformMemberCommunitiesSubscriptionsController";
import { CommunityplatformMemberPostsController } from "./controllers/communityPlatform/member/posts/CommunityplatformMemberPostsController";
import { CommunityplatformMemberPostsVoteController } from "./controllers/communityPlatform/member/posts/vote/CommunityplatformMemberPostsVoteController";
import { CommunityplatformMemberPostsVotesController } from "./controllers/communityPlatform/member/posts/votes/CommunityplatformMemberPostsVotesController";
import { CommunityplatformMemberProfileController } from "./controllers/communityPlatform/member/profile/CommunityplatformMemberProfileController";
import { CommunityplatformMemberReportsController } from "./controllers/communityPlatform/member/reports/CommunityplatformMemberReportsController";
import { CommunityplatformMemberSubscriptionsController } from "./controllers/communityPlatform/member/subscriptions/CommunityplatformMemberSubscriptionsController";

@Module({
  controllers: [
    CommunityplatformAuthGuestController,
    CommunityplatformAuthMemberController,
    CommunityplatformAuthAdminController,
    CommunityplatformGuestSessionsController,
    CommunityplatformMemberProfileController,
    CommunityplatformAdminAdminsController,
    CommunityplatformAdminPassword_resetsController,
    CommunityplatformCommunitiesController,
    CommunityplatformMemberCommunitiesController,
    CommunityplatformMemberSubscriptionsController,
    CommunityplatformMemberCommunitiesSubscriptionsController,
    CommunityplatformGuestPostsController,
    CommunityplatformMemberPostsController,
    CommunityplatformAdminPostsController,
    CommunityplatformGuestCommentsController,
    CommunityplatformMemberCommentsController,
    CommunityplatformAdminCommentsController,
    CommunityplatformMemberPostsVotesController,
    CommunityplatformMemberCommentsVotesController,
    CommunityplatformAdminCommunitiesModerationrolesController,
    CommunityplatformMemberCommunitiesModerationrolesController,
    CommunityplatformAdminCommunitiesBansController,
    CommunityplatformMemberCommunitiesBansController,
    CommunityplatformMemberReportsController,
    CommunityplatformAdminReportsController,
    CommunityplatformGuestCommunitiesController,
    CommunityplatformAdminCommunitiesController,
    CommunityplatformMemberCommunitiesSubscribedController,
    CommunityplatformMemberPostsVoteController,
    CommunityplatformMemberCommentsVoteController,
    CommunityplatformAdminCommunitiesReportsController,
  ],
})
export class MyModule {}
