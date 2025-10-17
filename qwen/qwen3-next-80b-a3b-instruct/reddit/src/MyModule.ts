import { Module } from "@nestjs/common";

import { AuthGuestController } from "./controllers/auth/guest/AuthGuestController";
import { AuthMemberController } from "./controllers/auth/member/AuthMemberController";
import { AuthModeratorController } from "./controllers/auth/moderator/AuthModeratorController";
import { AuthAdminController } from "./controllers/auth/admin/refresh/AuthAdminController";
import { AdminMembersCommunitiesModeratorController } from "./controllers/admin/members/communities/moderator/AdminMembersCommunitiesModeratorController";
import { AdminUsersBanController } from "./controllers/admin/users/ban/AdminUsersBanController";
import { AdminUsersUnbanController } from "./controllers/admin/users/unban/AdminUsersUnbanController";
import { AdminUsersPasswordResetController } from "./controllers/admin/users/password/reset/AdminUsersPasswordResetController";
import { AdminUsersEmailVerifyController } from "./controllers/admin/users/email/verify/AdminUsersEmailVerifyController";
import { CommunityplatformCommunitiesController } from "./controllers/communityPlatform/communities/CommunityplatformCommunitiesController";
import { CommunityplatformMemberCommunitiesController } from "./controllers/communityPlatform/member/communities/CommunityplatformMemberCommunitiesController";
import { CommunityplatformModeratorCommunitiesController } from "./controllers/communityPlatform/moderator/communities/CommunityplatformModeratorCommunitiesController";
import { CommunityplatformAdminCommunitiesController } from "./controllers/communityPlatform/admin/communities/CommunityplatformAdminCommunitiesController";
import { CommunityplatformPostsController } from "./controllers/communityPlatform/posts/CommunityplatformPostsController";
import { CommunityplatformMemberPostsController } from "./controllers/communityPlatform/member/posts/CommunityplatformMemberPostsController";
import { CommunityplatformPostsCommentsController } from "./controllers/communityPlatform/posts/comments/CommunityplatformPostsCommentsController";
import { CommunityplatformMemberPostsCommentsController } from "./controllers/communityPlatform/member/posts/comments/CommunityplatformMemberPostsCommentsController";
import { CommunityplatformAdminPostsCommentsController } from "./controllers/communityPlatform/admin/posts/comments/CommunityplatformAdminPostsCommentsController";
import { CommunityplatformMemberSubscriptionsController } from "./controllers/communityPlatform/member/subscriptions/CommunityplatformMemberSubscriptionsController";
import { CommunityplatformMemberReportsController } from "./controllers/communityPlatform/member/reports/CommunityplatformMemberReportsController";
import { CommunityplatformModeratorReportsController } from "./controllers/communityPlatform/moderator/reports/CommunityplatformModeratorReportsController";
import { CommunityplatformAdminReportsController } from "./controllers/communityPlatform/admin/reports/CommunityplatformAdminReportsController";

@Module({
  controllers: [
    AuthGuestController,
    AuthMemberController,
    AuthModeratorController,
    AuthAdminController,
    AdminMembersCommunitiesModeratorController,
    AdminUsersBanController,
    AdminUsersUnbanController,
    AdminUsersPasswordResetController,
    AdminUsersEmailVerifyController,
    CommunityplatformCommunitiesController,
    CommunityplatformMemberCommunitiesController,
    CommunityplatformModeratorCommunitiesController,
    CommunityplatformAdminCommunitiesController,
    CommunityplatformPostsController,
    CommunityplatformMemberPostsController,
    CommunityplatformPostsCommentsController,
    CommunityplatformMemberPostsCommentsController,
    CommunityplatformAdminPostsCommentsController,
    CommunityplatformMemberSubscriptionsController,
    CommunityplatformMemberReportsController,
    CommunityplatformModeratorReportsController,
    CommunityplatformAdminReportsController,
  ],
})
export class MyModule {}
