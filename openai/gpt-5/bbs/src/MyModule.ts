import { Module } from "@nestjs/common";

import { AuthVisitorController } from "./controllers/auth/visitor/AuthVisitorController";
import { AuthMemberController } from "./controllers/auth/member/AuthMemberController";
import { AuthMemberEmailVerifyController } from "./controllers/auth/member/email/verify/AuthMemberEmailVerifyController";
import { AuthMemberEmailVerificationResendController } from "./controllers/auth/member/email/verification/resend/AuthMemberEmailVerificationResendController";
import { AuthMemberPasswordResetController } from "./controllers/auth/member/password/reset/AuthMemberPasswordResetController";
import { AuthMemberPasswordResetConfirmController } from "./controllers/auth/member/password/reset/confirm/AuthMemberPasswordResetConfirmController";
import { AuthMemberPasswordController } from "./controllers/auth/member/password/AuthMemberPasswordController";
import { AuthMemberMfaSetupController } from "./controllers/auth/member/mfa/setup/AuthMemberMfaSetupController";
import { AuthMemberMfaVerifyController } from "./controllers/auth/member/mfa/verify/AuthMemberMfaVerifyController";
import { AuthMemberMfaController } from "./controllers/auth/member/mfa/AuthMemberMfaController";
import { AuthMemberMfaRecovery_codesRegenerateController } from "./controllers/auth/member/mfa/recovery-codes/regenerate/AuthMemberMfaRecovery_codesRegenerateController";
import { AuthVerifiedexpertController } from "./controllers/auth/verifiedExpert/AuthVerifiedexpertController";
import { AuthVerifiedexpertPasswordController } from "./controllers/auth/verifiedExpert/password/AuthVerifiedexpertPasswordController";
import { AuthVerifiedexpertPasswordForgotController } from "./controllers/auth/verifiedExpert/password/forgot/AuthVerifiedexpertPasswordForgotController";
import { AuthVerifiedexpertPasswordResetController } from "./controllers/auth/verifiedExpert/password/reset/AuthVerifiedexpertPasswordResetController";
import { AuthVerifiedexpertEmailController } from "./controllers/auth/verifiedExpert/email/sendVerification/AuthVerifiedexpertEmailController";
import { AuthVerifiedexpertEmailVerifyController } from "./controllers/auth/verifiedExpert/email/verify/AuthVerifiedexpertEmailVerifyController";
import { AuthVerifiedexpertMfaEnrollController } from "./controllers/auth/verifiedExpert/mfa/enroll/AuthVerifiedexpertMfaEnrollController";
import { AuthVerifiedexpertMfaVerifyController } from "./controllers/auth/verifiedExpert/mfa/verify/AuthVerifiedexpertMfaVerifyController";
import { AuthVerifiedexpertMfaDisableController } from "./controllers/auth/verifiedExpert/mfa/disable/AuthVerifiedexpertMfaDisableController";
import { AuthVerifiedexpertMfaRecovery_codesController } from "./controllers/auth/verifiedExpert/mfa/recovery-codes/AuthVerifiedexpertMfaRecovery_codesController";
import { AuthModeratorController } from "./controllers/auth/moderator/AuthModeratorController";
import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { AuthAdminEmailResendController } from "./controllers/auth/admin/email/resend/AuthAdminEmailResendController";
import { AuthAdminEmailVerifyController } from "./controllers/auth/admin/email/verify/AuthAdminEmailVerifyController";
import { AuthAdminPasswordController } from "./controllers/auth/admin/password/AuthAdminPasswordController";
import { AuthAdminPasswordResetRequestController } from "./controllers/auth/admin/password/reset/request/AuthAdminPasswordResetRequestController";
import { AuthAdminPasswordResetConfirmController } from "./controllers/auth/admin/password/reset/confirm/AuthAdminPasswordResetConfirmController";
import { AuthAdminMfaSetupController } from "./controllers/auth/admin/mfa/setup/AuthAdminMfaSetupController";
import { AuthAdminMfaVerifyController } from "./controllers/auth/admin/mfa/verify/AuthAdminMfaVerifyController";
import { AuthAdminMfaController } from "./controllers/auth/admin/mfa/AuthAdminMfaController";
import { AuthAdminMfaRecovery_codesRegenController } from "./controllers/auth/admin/mfa/recovery-codes/regen/AuthAdminMfaRecovery_codesRegenController";
import { EcondiscussUsersController } from "./controllers/econDiscuss/users/EcondiscussUsersController";
import { EcondiscussUsersProfileController } from "./controllers/econDiscuss/users/profile/EcondiscussUsersProfileController";
import { EcondiscussUsersFollowersController } from "./controllers/econDiscuss/users/followers/EcondiscussUsersFollowersController";
import { EcondiscussUsersFollowingController } from "./controllers/econDiscuss/users/following/EcondiscussUsersFollowingController";
import { EcondiscussMemberUsersFollowController } from "./controllers/econDiscuss/member/users/follow/EcondiscussMemberUsersFollowController";
import { EcondiscussMemberUsersReputationController } from "./controllers/econDiscuss/member/users/reputation/EcondiscussMemberUsersReputationController";
import { EcondiscussMemberUsersReputationEventsController } from "./controllers/econDiscuss/member/users/reputation/events/EcondiscussMemberUsersReputationEventsController";
import { EcondiscussUsersExpertdomainbadgesController } from "./controllers/econDiscuss/users/expertDomainBadges/EcondiscussUsersExpertdomainbadgesController";
import { EcondiscussMemberMeController } from "./controllers/econDiscuss/member/me/EcondiscussMemberMeController";
import { EcondiscussMemberMeProfileController } from "./controllers/econDiscuss/member/me/profile/EcondiscussMemberMeProfileController";
import { EcondiscussMemberMeReputationController } from "./controllers/econDiscuss/member/me/reputation/EcondiscussMemberMeReputationController";
import { EcondiscussMemberMeReputationEventsController } from "./controllers/econDiscuss/member/me/reputation/events/EcondiscussMemberMeReputationEventsController";
import { EcondiscussMemberMeTopicsController } from "./controllers/econDiscuss/member/me/topics/EcondiscussMemberMeTopicsController";
import { EcondiscussMemberMeVotesController } from "./controllers/econDiscuss/member/me/votes/EcondiscussMemberMeVotesController";
import { EcondiscussMemberMeBookmarksController } from "./controllers/econDiscuss/member/me/bookmarks/EcondiscussMemberMeBookmarksController";
import { EcondiscussMemberMeNotificationsController } from "./controllers/econDiscuss/member/me/notifications/EcondiscussMemberMeNotificationsController";
import { EcondiscussTopicsController } from "./controllers/econDiscuss/topics/EcondiscussTopicsController";
import { EcondiscussAdminTopicsController } from "./controllers/econDiscuss/admin/topics/EcondiscussAdminTopicsController";
import { EcondiscussMemberTopicsSubscribeController } from "./controllers/econDiscuss/member/topics/subscribe/EcondiscussMemberTopicsSubscribeController";
import { EcondiscussPostsController } from "./controllers/econDiscuss/posts/EcondiscussPostsController";
import { EcondiscussMemberPostsController } from "./controllers/econDiscuss/member/posts/EcondiscussMemberPostsController";
import { EcondiscussPostsTopicsController } from "./controllers/econDiscuss/posts/topics/EcondiscussPostsTopicsController";
import { EcondiscussMemberPostsTopicsController } from "./controllers/econDiscuss/member/posts/topics/EcondiscussMemberPostsTopicsController";
import { EcondiscussPostsVersionsController } from "./controllers/econDiscuss/posts/versions/EcondiscussPostsVersionsController";
import { EcondiscussAdminPostsVotesController } from "./controllers/econDiscuss/admin/posts/votes/EcondiscussAdminPostsVotesController";
import { EcondiscussMemberPostsVotesController } from "./controllers/econDiscuss/member/posts/votes/EcondiscussMemberPostsVotesController";
import { EcondiscussMemberPostsVotesSelfController } from "./controllers/econDiscuss/member/posts/votes/self/EcondiscussMemberPostsVotesSelfController";
import { EcondiscussMemberPostsBookmarksController } from "./controllers/econDiscuss/member/posts/bookmarks/EcondiscussMemberPostsBookmarksController";
import { EcondiscussMemberPostsBookmarksSelfController } from "./controllers/econDiscuss/member/posts/bookmarks/self/EcondiscussMemberPostsBookmarksSelfController";
import { EcondiscussMemberDraftsController } from "./controllers/econDiscuss/member/drafts/EcondiscussMemberDraftsController";
import { EcondiscussPostsPollController } from "./controllers/econDiscuss/posts/poll/EcondiscussPostsPollController";
import { EcondiscussMemberPostsPollController } from "./controllers/econDiscuss/member/posts/poll/EcondiscussMemberPostsPollController";
import { EcondiscussPostsPollOptionsController } from "./controllers/econDiscuss/posts/poll/options/EcondiscussPostsPollOptionsController";
import { EcondiscussMemberPostsPollOptionsController } from "./controllers/econDiscuss/member/posts/poll/options/EcondiscussMemberPostsPollOptionsController";
import { EcondiscussModeratorPostsPollOptionsController } from "./controllers/econDiscuss/moderator/posts/poll/options/EcondiscussModeratorPostsPollOptionsController";
import { EcondiscussModeratorPostsPollResponsesController } from "./controllers/econDiscuss/moderator/posts/poll/responses/EcondiscussModeratorPostsPollResponsesController";
import { EcondiscussMemberPostsPollResponsesController } from "./controllers/econDiscuss/member/posts/poll/responses/EcondiscussMemberPostsPollResponsesController";
import { EcondiscussMemberPostsPollResponsesOptionsController } from "./controllers/econDiscuss/member/posts/poll/responses/options/EcondiscussMemberPostsPollResponsesOptionsController";
import { EcondiscussPostsPollResultsController } from "./controllers/econDiscuss/posts/poll/results/EcondiscussPostsPollResultsController";
import { EcondiscussLivethreadsController } from "./controllers/econDiscuss/liveThreads/EcondiscussLivethreadsController";
import { EcondiscussPostsLiveController } from "./controllers/econDiscuss/posts/live/EcondiscussPostsLiveController";
import { EcondiscussMemberPostsLiveController } from "./controllers/econDiscuss/member/posts/live/EcondiscussMemberPostsLiveController";
import { EcondiscussPostsLiveMessagesController } from "./controllers/econDiscuss/posts/live/messages/EcondiscussPostsLiveMessagesController";
import { EcondiscussMemberPostsLiveMessagesController } from "./controllers/econDiscuss/member/posts/live/messages/EcondiscussMemberPostsLiveMessagesController";

@Module({
  controllers: [
    AuthVisitorController,
    AuthMemberController,
    AuthMemberEmailVerifyController,
    AuthMemberEmailVerificationResendController,
    AuthMemberPasswordResetController,
    AuthMemberPasswordResetConfirmController,
    AuthMemberPasswordController,
    AuthMemberMfaSetupController,
    AuthMemberMfaVerifyController,
    AuthMemberMfaController,
    AuthMemberMfaRecovery_codesRegenerateController,
    AuthVerifiedexpertController,
    AuthVerifiedexpertPasswordController,
    AuthVerifiedexpertPasswordForgotController,
    AuthVerifiedexpertPasswordResetController,
    AuthVerifiedexpertEmailController,
    AuthVerifiedexpertEmailVerifyController,
    AuthVerifiedexpertMfaEnrollController,
    AuthVerifiedexpertMfaVerifyController,
    AuthVerifiedexpertMfaDisableController,
    AuthVerifiedexpertMfaRecovery_codesController,
    AuthModeratorController,
    AuthAdminController,
    AuthAdminEmailResendController,
    AuthAdminEmailVerifyController,
    AuthAdminPasswordController,
    AuthAdminPasswordResetRequestController,
    AuthAdminPasswordResetConfirmController,
    AuthAdminMfaSetupController,
    AuthAdminMfaVerifyController,
    AuthAdminMfaController,
    AuthAdminMfaRecovery_codesRegenController,
    EcondiscussUsersController,
    EcondiscussUsersProfileController,
    EcondiscussUsersFollowersController,
    EcondiscussUsersFollowingController,
    EcondiscussMemberUsersFollowController,
    EcondiscussMemberUsersReputationController,
    EcondiscussMemberUsersReputationEventsController,
    EcondiscussUsersExpertdomainbadgesController,
    EcondiscussMemberMeController,
    EcondiscussMemberMeProfileController,
    EcondiscussMemberMeReputationController,
    EcondiscussMemberMeReputationEventsController,
    EcondiscussMemberMeTopicsController,
    EcondiscussMemberMeVotesController,
    EcondiscussMemberMeBookmarksController,
    EcondiscussMemberMeNotificationsController,
    EcondiscussTopicsController,
    EcondiscussAdminTopicsController,
    EcondiscussMemberTopicsSubscribeController,
    EcondiscussPostsController,
    EcondiscussMemberPostsController,
    EcondiscussPostsTopicsController,
    EcondiscussMemberPostsTopicsController,
    EcondiscussPostsVersionsController,
    EcondiscussAdminPostsVotesController,
    EcondiscussMemberPostsVotesController,
    EcondiscussMemberPostsVotesSelfController,
    EcondiscussMemberPostsBookmarksController,
    EcondiscussMemberPostsBookmarksSelfController,
    EcondiscussMemberDraftsController,
    EcondiscussPostsPollController,
    EcondiscussMemberPostsPollController,
    EcondiscussPostsPollOptionsController,
    EcondiscussMemberPostsPollOptionsController,
    EcondiscussModeratorPostsPollOptionsController,
    EcondiscussModeratorPostsPollResponsesController,
    EcondiscussMemberPostsPollResponsesController,
    EcondiscussMemberPostsPollResponsesOptionsController,
    EcondiscussPostsPollResultsController,
    EcondiscussLivethreadsController,
    EcondiscussPostsLiveController,
    EcondiscussMemberPostsLiveController,
    EcondiscussPostsLiveMessagesController,
    EcondiscussMemberPostsLiveMessagesController,
  ],
})
export class MyModule {}
