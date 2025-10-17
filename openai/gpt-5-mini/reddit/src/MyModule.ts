import { Module } from "@nestjs/common";

import { AuthGuestController } from "./controllers/auth/guest/AuthGuestController";
import { AuthMemberController } from "./controllers/auth/member/AuthMemberController";
import { AuthMemberPasswordRequest_resetController } from "./controllers/auth/member/password/request-reset/AuthMemberPasswordRequest_resetController";
import { AuthMemberPasswordChangeController } from "./controllers/auth/member/password/change/AuthMemberPasswordChangeController";
import { AuthMemberVerify_emailController } from "./controllers/auth/member/verify-email/AuthMemberVerify_emailController";
import { AuthModeratorController } from "./controllers/auth/moderator/AuthModeratorController";
import { AuthModeratorVerifyController } from "./controllers/auth/moderator/verify/AuthModeratorVerifyController";
import { AuthModeratorPasswordRequest_resetController } from "./controllers/auth/moderator/password/request-reset/AuthModeratorPasswordRequest_resetController";
import { AuthModeratorPasswordResetController } from "./controllers/auth/moderator/password/reset/AuthModeratorPasswordResetController";
import { AuthModeratorPasswordChangeController } from "./controllers/auth/moderator/password/change/AuthModeratorPasswordChangeController";
import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { AuthAdminPasswordResetController } from "./controllers/auth/admin/password/reset/AuthAdminPasswordResetController";
import { AuthAdminPasswordConfirmController } from "./controllers/auth/admin/password/confirm/AuthAdminPasswordConfirmController";
import { AuthAdminPasswordController } from "./controllers/auth/admin/password/AuthAdminPasswordController";
import { AuthAdminEmailVerifyController } from "./controllers/auth/admin/email/verify/AuthAdminEmailVerifyController";
import { CommunityportalUsersController } from "./controllers/communityPortal/users/CommunityportalUsersController";
import { CommunityportalMemberUsersController } from "./controllers/communityPortal/member/users/CommunityportalMemberUsersController";
import { CommunityportalCommunitiesController } from "./controllers/communityPortal/communities/CommunityportalCommunitiesController";
import { CommunityportalMemberCommunitiesController } from "./controllers/communityPortal/member/communities/CommunityportalMemberCommunitiesController";
import { CommunityportalMemberSubscriptionsController } from "./controllers/communityPortal/member/subscriptions/CommunityportalMemberSubscriptionsController";
import { CommunityportalMemberUsersSubscriptionsController } from "./controllers/communityPortal/member/users/subscriptions/CommunityportalMemberUsersSubscriptionsController";
import { CommunityportalMemberCommunitiesSubscriptionsController } from "./controllers/communityPortal/member/communities/subscriptions/CommunityportalMemberCommunitiesSubscriptionsController";
import { CommunityportalPostsController } from "./controllers/communityPortal/posts/CommunityportalPostsController";
import { CommunityportalMemberPostsController } from "./controllers/communityPortal/member/posts/CommunityportalMemberPostsController";
import { CommunityportalCommunitiesPostsController } from "./controllers/communityPortal/communities/posts/CommunityportalCommunitiesPostsController";
import { CommunityportalPostsCommentsController } from "./controllers/communityPortal/posts/comments/CommunityportalPostsCommentsController";
import { CommunityportalMemberPostsCommentsController } from "./controllers/communityPortal/member/posts/comments/CommunityportalMemberPostsCommentsController";
import { CommunityportalMemberPostsVotesController } from "./controllers/communityPortal/member/posts/votes/CommunityportalMemberPostsVotesController";
import { CommunityportalMemberPostsCommentsVotesController } from "./controllers/communityPortal/member/posts/comments/votes/CommunityportalMemberPostsCommentsVotesController";
import { CommunityportalMemberVotesController } from "./controllers/communityPortal/member/votes/CommunityportalMemberVotesController";
import { CommunityportalMemberReportsController } from "./controllers/communityPortal/member/reports/CommunityportalMemberReportsController";
import { CommunityportalModeratorReportsController } from "./controllers/communityPortal/moderator/reports/CommunityportalModeratorReportsController";
import { CommunityportalAdminReportsController } from "./controllers/communityPortal/admin/reports/CommunityportalAdminReportsController";
import { CommunityportalMemberPostsReportsController } from "./controllers/communityPortal/member/posts/reports/CommunityportalMemberPostsReportsController";
import { CommunityportalMemberCommentsReportsController } from "./controllers/communityPortal/member/comments/reports/CommunityportalMemberCommentsReportsController";
import { CommunityportalUsersPostsController } from "./controllers/communityPortal/users/posts/CommunityportalUsersPostsController";
import { CommunityportalUsersCommentsController } from "./controllers/communityPortal/users/comments/CommunityportalUsersCommentsController";

@Module({
  controllers: [
    AuthGuestController,
    AuthMemberController,
    AuthMemberPasswordRequest_resetController,
    AuthMemberPasswordChangeController,
    AuthMemberVerify_emailController,
    AuthModeratorController,
    AuthModeratorVerifyController,
    AuthModeratorPasswordRequest_resetController,
    AuthModeratorPasswordResetController,
    AuthModeratorPasswordChangeController,
    AuthAdminController,
    AuthAdminPasswordResetController,
    AuthAdminPasswordConfirmController,
    AuthAdminPasswordController,
    AuthAdminEmailVerifyController,
    CommunityportalUsersController,
    CommunityportalMemberUsersController,
    CommunityportalCommunitiesController,
    CommunityportalMemberCommunitiesController,
    CommunityportalMemberSubscriptionsController,
    CommunityportalMemberUsersSubscriptionsController,
    CommunityportalMemberCommunitiesSubscriptionsController,
    CommunityportalPostsController,
    CommunityportalMemberPostsController,
    CommunityportalCommunitiesPostsController,
    CommunityportalPostsCommentsController,
    CommunityportalMemberPostsCommentsController,
    CommunityportalMemberPostsVotesController,
    CommunityportalMemberPostsCommentsVotesController,
    CommunityportalMemberVotesController,
    CommunityportalMemberReportsController,
    CommunityportalModeratorReportsController,
    CommunityportalAdminReportsController,
    CommunityportalMemberPostsReportsController,
    CommunityportalMemberCommentsReportsController,
    CommunityportalUsersPostsController,
    CommunityportalUsersCommentsController,
  ],
})
export class MyModule {}
