import { Module } from "@nestjs/common";

import { AuthUserController } from "./controllers/auth/user/AuthUserController";
import { AuthUserEmailVerifyRequestController } from "./controllers/auth/user/email/verify/request/AuthUserEmailVerifyRequestController";
import { AuthUserEmailVerifyConfirmController } from "./controllers/auth/user/email/verify/confirm/AuthUserEmailVerifyConfirmController";
import { AuthUserPasswordResetRequestController } from "./controllers/auth/user/password/reset/request/AuthUserPasswordResetRequestController";
import { AuthUserPasswordResetConfirmController } from "./controllers/auth/user/password/reset/confirm/AuthUserPasswordResetConfirmController";
import { AuthUserPasswordController } from "./controllers/auth/user/password/AuthUserPasswordController";
import { AuthUser_logoutOthersController } from "./controllers/auth/user/logout/others/AuthUser_logoutOthersController";
import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { AuthAdminEmailVerificationController } from "./controllers/auth/admin/email/verification/AuthAdminEmailVerificationController";
import { AuthAdminEmailVerifyController } from "./controllers/auth/admin/email/verify/AuthAdminEmailVerifyController";
import { AuthAdminPasswordResetRequestController } from "./controllers/auth/admin/password/reset/request/AuthAdminPasswordResetRequestController";
import { AuthAdminPasswordResetController } from "./controllers/auth/admin/password/reset/AuthAdminPasswordResetController";
import { AuthAdminPasswordController } from "./controllers/auth/admin/password/AuthAdminPasswordController";
import { AuthAdminSessionsRevokeController } from "./controllers/auth/admin/sessions/revoke/AuthAdminSessionsRevokeController";
import { CivicboardAdminConfigurationsController } from "./controllers/civicBoard/admin/configurations/CivicboardAdminConfigurationsController";
import { CivicboardAdminPoliciesController } from "./controllers/civicBoard/admin/policies/CivicboardAdminPoliciesController";
import { CivicboardAdminAuditlogsController } from "./controllers/civicBoard/admin/auditLogs/CivicboardAdminAuditlogsController";
import { CivicboardAdminRatelimitsController } from "./controllers/civicBoard/admin/rateLimits/CivicboardAdminRatelimitsController";
import { CivicboardPostsController } from "./controllers/civicBoard/posts/CivicboardPostsController";
import { CivicboardUserPostsController } from "./controllers/civicBoard/user/posts/CivicboardUserPostsController";
import { CivicboardAdminPostsController } from "./controllers/civicBoard/admin/posts/CivicboardAdminPostsController";
import { CivicboardPostsCompleteController } from "./controllers/civicBoard/posts/complete/CivicboardPostsCompleteController";
import { CivicboardPostsCommentsController } from "./controllers/civicBoard/posts/comments/CivicboardPostsCommentsController";
import { CivicboardUserPostsCommentsController } from "./controllers/civicBoard/user/posts/comments/CivicboardUserPostsCommentsController";
import { CivicboardAdminPostsCommentsController } from "./controllers/civicBoard/admin/posts/comments/CivicboardAdminPostsCommentsController";
import { CivicboardPostsAttachmentsController } from "./controllers/civicBoard/posts/attachments/CivicboardPostsAttachmentsController";
import { CivicboardUserPostsAttachmentsController } from "./controllers/civicBoard/user/posts/attachments/CivicboardUserPostsAttachmentsController";
import { CivicboardUserPostsReportsController } from "./controllers/civicBoard/user/posts/reports/CivicboardUserPostsReportsController";
import { CivicboardUserCommentsReportsController } from "./controllers/civicBoard/user/comments/reports/CivicboardUserCommentsReportsController";
import { CivicboardAdminReportsController } from "./controllers/civicBoard/admin/reports/CivicboardAdminReportsController";
import { CivicboardAdminReportsModerationactionController } from "./controllers/civicBoard/admin/reports/moderationAction/CivicboardAdminReportsModerationactionController";
import { CivicboardAdminModerationactionsController } from "./controllers/civicBoard/admin/moderationActions/CivicboardAdminModerationactionsController";
import { CivicboardUserPostsReactionsController } from "./controllers/civicBoard/user/posts/reactions/CivicboardUserPostsReactionsController";
import { CivicboardUserCommentsReactionsController } from "./controllers/civicBoard/user/comments/reactions/CivicboardUserCommentsReactionsController";
import { CivicboardPostsReactionsCountController } from "./controllers/civicBoard/posts/reactions/count/CivicboardPostsReactionsCountController";
import { CivicboardCommentsReactionsCountController } from "./controllers/civicBoard/comments/reactions/count/CivicboardCommentsReactionsCountController";
import { CivicboardSearchPostsController } from "./controllers/civicBoard/search/posts/CivicboardSearchPostsController";
import { CivicboardAdminUsersController } from "./controllers/civicBoard/admin/users/CivicboardAdminUsersController";
import { CivicboardReactionpoliciesController } from "./controllers/civicBoard/reactionPolicies/CivicboardReactionpoliciesController";
import { CivicboardAdminReactionpoliciesController } from "./controllers/civicBoard/admin/reactionPolicies/CivicboardAdminReactionpoliciesController";
import { CivicboardAdminDashboardModerationoverviewController } from "./controllers/civicBoard/admin/dashboard/moderationOverview/CivicboardAdminDashboardModerationoverviewController";
import { CivicboardAdminStatisticsReportsbyreasonController } from "./controllers/civicBoard/admin/statistics/reportsByReason/CivicboardAdminStatisticsReportsbyreasonController";
import { CivicboardAdminStatisticsReportsbydayController } from "./controllers/civicBoard/admin/statistics/reportsByDay/CivicboardAdminStatisticsReportsbydayController";
import { CivicboardAdminAnalyticsReportsController } from "./controllers/civicBoard/admin/analytics/reports/CivicboardAdminAnalyticsReportsController";

@Module({
  controllers: [
    AuthUserController,
    AuthUserEmailVerifyRequestController,
    AuthUserEmailVerifyConfirmController,
    AuthUserPasswordResetRequestController,
    AuthUserPasswordResetConfirmController,
    AuthUserPasswordController,
    AuthUser_logoutOthersController,
    AuthAdminController,
    AuthAdminEmailVerificationController,
    AuthAdminEmailVerifyController,
    AuthAdminPasswordResetRequestController,
    AuthAdminPasswordResetController,
    AuthAdminPasswordController,
    AuthAdminSessionsRevokeController,
    CivicboardAdminConfigurationsController,
    CivicboardAdminPoliciesController,
    CivicboardAdminAuditlogsController,
    CivicboardAdminRatelimitsController,
    CivicboardPostsController,
    CivicboardUserPostsController,
    CivicboardAdminPostsController,
    CivicboardPostsCompleteController,
    CivicboardPostsCommentsController,
    CivicboardUserPostsCommentsController,
    CivicboardAdminPostsCommentsController,
    CivicboardPostsAttachmentsController,
    CivicboardUserPostsAttachmentsController,
    CivicboardUserPostsReportsController,
    CivicboardUserCommentsReportsController,
    CivicboardAdminReportsController,
    CivicboardAdminReportsModerationactionController,
    CivicboardAdminModerationactionsController,
    CivicboardUserPostsReactionsController,
    CivicboardUserCommentsReactionsController,
    CivicboardPostsReactionsCountController,
    CivicboardCommentsReactionsCountController,
    CivicboardSearchPostsController,
    CivicboardAdminUsersController,
    CivicboardReactionpoliciesController,
    CivicboardAdminReactionpoliciesController,
    CivicboardAdminDashboardModerationoverviewController,
    CivicboardAdminStatisticsReportsbyreasonController,
    CivicboardAdminStatisticsReportsbydayController,
    CivicboardAdminAnalyticsReportsController,
  ],
})
export class MyModule {}
