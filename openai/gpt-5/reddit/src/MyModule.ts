import { Module } from "@nestjs/common";

import { AuthGuestuserController } from "./controllers/auth/guestUser/AuthGuestuserController";
import { AuthMemberuserController } from "./controllers/auth/memberUser/AuthMemberuserController";
import { AuthCommunityownerController } from "./controllers/auth/communityOwner/AuthCommunityownerController";
import { AuthCommunityownerEmailVerifyController } from "./controllers/auth/communityOwner/email/verify/AuthCommunityownerEmailVerifyController";
import { AuthCommunityownerPasswordController } from "./controllers/auth/communityOwner/password/AuthCommunityownerPasswordController";
import { AuthCommunitymoderatorController } from "./controllers/auth/communityModerator/AuthCommunitymoderatorController";
import { MyPasswordController } from "./controllers/my/password/MyPasswordController";
import { AuthAdminuserController } from "./controllers/auth/adminUser/AuthAdminuserController";
import { AuthAdminuserEmailVerifyController } from "./controllers/auth/adminUser/email/verify/AuthAdminuserEmailVerifyController";
import { AuthAdminuserEmailResendController } from "./controllers/auth/adminUser/email/resend/AuthAdminuserEmailResendController";
import { AuthAdminuserPasswordResetController } from "./controllers/auth/adminUser/password/reset/AuthAdminuserPasswordResetController";
import { AuthAdminuserPasswordResetConfirmController } from "./controllers/auth/adminUser/password/reset/confirm/AuthAdminuserPasswordResetConfirmController";
import { AuthAdminuserPasswordController } from "./controllers/auth/adminUser/password/AuthAdminuserPasswordController";
import { CommunityplatformMemberuserCommunitiesController } from "./controllers/communityPlatform/memberUser/communities/CommunityplatformMemberuserCommunitiesController";
import { CommunityplatformCommunitiesController } from "./controllers/communityPlatform/communities/CommunityplatformCommunitiesController";
import { CommunityplatformMemberuserCommunitiesSubscribeController } from "./controllers/communityPlatform/memberUser/communities/subscribe/CommunityplatformMemberuserCommunitiesSubscribeController";
import { CommunityplatformMemberuserCommunitiesPostsController } from "./controllers/communityPlatform/memberUser/communities/posts/CommunityplatformMemberuserCommunitiesPostsController";
import { CommunityplatformCommunitiesPostsController } from "./controllers/communityPlatform/communities/posts/CommunityplatformCommunitiesPostsController";
import { CommunityplatformPostsController } from "./controllers/communityPlatform/posts/CommunityplatformPostsController";
import { CommunityplatformMemberuserPostsVoteController } from "./controllers/communityPlatform/memberUser/posts/vote/CommunityplatformMemberuserPostsVoteController";
import { CommunityplatformMemberuserPostsCommentsController } from "./controllers/communityPlatform/memberUser/posts/comments/CommunityplatformMemberuserPostsCommentsController";
import { CommunityplatformPostsCommentsController } from "./controllers/communityPlatform/posts/comments/CommunityplatformPostsCommentsController";
import { CommunityplatformMemberuserCommentsVoteController } from "./controllers/communityPlatform/memberUser/comments/vote/CommunityplatformMemberuserCommentsVoteController";
import { CommunityplatformUsersProfileController } from "./controllers/communityPlatform/users/profile/CommunityplatformUsersProfileController";
import { CommunityplatformUsersKarmaController } from "./controllers/communityPlatform/users/karma/CommunityplatformUsersKarmaController";
import { CommunityplatformMemberuserPostsReportsController } from "./controllers/communityPlatform/memberUser/posts/reports/CommunityplatformMemberuserPostsReportsController";
import { CommunityplatformMemberuserCommentsReportsController } from "./controllers/communityPlatform/memberUser/comments/reports/CommunityplatformMemberuserCommentsReportsController";

@Module({
  controllers: [
    AuthGuestuserController,
    AuthMemberuserController,
    AuthCommunityownerController,
    AuthCommunityownerEmailVerifyController,
    AuthCommunityownerPasswordController,
    AuthCommunitymoderatorController,
    MyPasswordController,
    AuthAdminuserController,
    AuthAdminuserEmailVerifyController,
    AuthAdminuserEmailResendController,
    AuthAdminuserPasswordResetController,
    AuthAdminuserPasswordResetConfirmController,
    AuthAdminuserPasswordController,
    CommunityplatformMemberuserCommunitiesController,
    CommunityplatformCommunitiesController,
    CommunityplatformMemberuserCommunitiesSubscribeController,
    CommunityplatformMemberuserCommunitiesPostsController,
    CommunityplatformCommunitiesPostsController,
    CommunityplatformPostsController,
    CommunityplatformMemberuserPostsVoteController,
    CommunityplatformMemberuserPostsCommentsController,
    CommunityplatformPostsCommentsController,
    CommunityplatformMemberuserCommentsVoteController,
    CommunityplatformUsersProfileController,
    CommunityplatformUsersKarmaController,
    CommunityplatformMemberuserPostsReportsController,
    CommunityplatformMemberuserCommentsReportsController,
  ],
})
export class MyModule {}
