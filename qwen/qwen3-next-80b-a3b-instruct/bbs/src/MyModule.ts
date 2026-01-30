import { Module } from "@nestjs/common";

import { EconomicforumAuthUserController } from "./controllers/economicForum/auth/user/EconomicforumAuthUserController";
import { EconomicforumAuthAdminController } from "./controllers/economicForum/auth/admin/EconomicforumAuthAdminController";
import { EconomicforumUserAuthUsersLogoutController } from "./controllers/economicForum/user/auth/users/logout/EconomicforumUserAuthUsersLogoutController";
import { EconomicforumUserAuthUsersEmailVerifyController } from "./controllers/economicForum/user/auth/users/email/verify/EconomicforumUserAuthUsersEmailVerifyController";
import { EconomicforumUserAuthUsersEmailVerifyResendController } from "./controllers/economicForum/user/auth/users/email/verify/resend/EconomicforumUserAuthUsersEmailVerifyResendController";
import { EconomicforumUserUsersController } from "./controllers/economicForum/user/users/EconomicforumUserUsersController";
import { EconomicforumAdminAuthAdminsLogoutController } from "./controllers/economicForum/admin/auth/admins/logout/EconomicforumAdminAuthAdminsLogoutController";
import { EconomicforumAdminAuthAdminsEmail_verifyController } from "./controllers/economicForum/admin/auth/admins/email/verify/request/EconomicforumAdminAuthAdminsEmail_verifyController";
import { EconomicforumAdminAuthAdminsEmailController } from "./controllers/economicForum/admin/auth/admins/email/verify/EconomicforumAdminAuthAdminsEmailController";
import { EconomicforumAdminAuthAdminsEmail_verifyResendController } from "./controllers/economicForum/admin/auth/admins/email/verify/resend/EconomicforumAdminAuthAdminsEmail_verifyResendController";
import { EconomicforumAdminAdminsController } from "./controllers/economicForum/admin/admins/EconomicforumAdminAdminsController";
import { EconomicforumUserAuthUsersEmailVerificationsController } from "./controllers/economicForum/user/auth/users/email/verifications/EconomicforumUserAuthUsersEmailVerificationsController";
import { EconomicforumUserAuthUsersPasswordResetsController } from "./controllers/economicForum/user/auth/users/password/resets/EconomicforumUserAuthUsersPasswordResetsController";
import { EconomicforumAdminAuthAdminsEmailVerificationsController } from "./controllers/economicForum/admin/auth/admins/email/verifications/EconomicforumAdminAuthAdminsEmailVerificationsController";
import { EconomicforumAdminAuthAdminsPasswordResetsController } from "./controllers/economicForum/admin/auth/admins/password/resets/EconomicforumAdminAuthAdminsPasswordResetsController";
import { EconomicforumUserAuthUsersSessionsController } from "./controllers/economicForum/user/auth/users/sessions/EconomicforumUserAuthUsersSessionsController";
import { EconomicforumAdminAuthAdminsSessionsController } from "./controllers/economicForum/admin/auth/admins/sessions/EconomicforumAdminAuthAdminsSessionsController";
import { EconomicforumUserPostsController } from "./controllers/economicForum/user/posts/EconomicforumUserPostsController";
import { EconomicforumAdminPostsController } from "./controllers/economicForum/admin/posts/EconomicforumAdminPostsController";
import { EconomicforumUserPostsCommentsController } from "./controllers/economicForum/user/posts/comments/EconomicforumUserPostsCommentsController";
import { EconomicforumAdminPostsCommentsController } from "./controllers/economicForum/admin/posts/comments/EconomicforumAdminPostsCommentsController";
import { EconomicforumUserPostsReportsController } from "./controllers/economicForum/user/posts/reports/EconomicforumUserPostsReportsController";
import { EconomicforumAdminPostsReportsController } from "./controllers/economicForum/admin/posts/reports/EconomicforumAdminPostsReportsController";
import { EconomicforumUserAttachmentfilesController } from "./controllers/economicForum/user/attachmentFiles/EconomicforumUserAttachmentfilesController";
import { EconomicforumAdminAttachmentfilesController } from "./controllers/economicForum/admin/attachmentFiles/EconomicforumAdminAttachmentfilesController";
import { EconomicforumAdminSystemAuditReportsController } from "./controllers/economicForum/admin/system/audit/reports/EconomicforumAdminSystemAuditReportsController";
import { EconomicforumAdminSystemMaintenanceStatusController } from "./controllers/economicForum/admin/system/maintenance/status/EconomicforumAdminSystemMaintenanceStatusController";
import { EconomicforumAdminSystemAnalyticsModerationController } from "./controllers/economicForum/admin/system/analytics/moderation/EconomicforumAdminSystemAnalyticsModerationController";
import { EconomicforumAdminSystemUploadLimitsController } from "./controllers/economicForum/admin/system/upload/limits/EconomicforumAdminSystemUploadLimitsController";
import { EconomicforumPostsCommentsMetricsController } from "./controllers/economicForum/posts/comments/metrics/EconomicforumPostsCommentsMetricsController";
import { EconomicforumPostsModerationSummaryController } from "./controllers/economicForum/posts/moderation/summary/EconomicforumPostsModerationSummaryController";
import { EconomicforumPostsAnalyticsController } from "./controllers/economicForum/posts/analytics/EconomicforumPostsAnalyticsController";
import { EconomicforumPostsAttachmentsController } from "./controllers/economicForum/posts/attachments/EconomicforumPostsAttachmentsController";
import { EconomicforumAdminAttachment_filesSummaryController } from "./controllers/economicForum/admin/attachment-files/summary/EconomicforumAdminAttachment_filesSummaryController";

@Module({
  controllers: [
    EconomicforumAuthUserController,
    EconomicforumAuthAdminController,
    EconomicforumUserAuthUsersLogoutController,
    EconomicforumUserAuthUsersEmailVerifyController,
    EconomicforumUserAuthUsersEmailVerifyResendController,
    EconomicforumUserUsersController,
    EconomicforumAdminAuthAdminsLogoutController,
    EconomicforumAdminAuthAdminsEmail_verifyController,
    EconomicforumAdminAuthAdminsEmailController,
    EconomicforumAdminAuthAdminsEmail_verifyResendController,
    EconomicforumAdminAdminsController,
    EconomicforumUserAuthUsersEmailVerificationsController,
    EconomicforumUserAuthUsersPasswordResetsController,
    EconomicforumAdminAuthAdminsEmailVerificationsController,
    EconomicforumAdminAuthAdminsPasswordResetsController,
    EconomicforumUserAuthUsersSessionsController,
    EconomicforumAdminAuthAdminsSessionsController,
    EconomicforumUserPostsController,
    EconomicforumAdminPostsController,
    EconomicforumUserPostsCommentsController,
    EconomicforumAdminPostsCommentsController,
    EconomicforumUserPostsReportsController,
    EconomicforumAdminPostsReportsController,
    EconomicforumUserAttachmentfilesController,
    EconomicforumAdminAttachmentfilesController,
    EconomicforumAdminSystemAuditReportsController,
    EconomicforumAdminSystemMaintenanceStatusController,
    EconomicforumAdminSystemAnalyticsModerationController,
    EconomicforumAdminSystemUploadLimitsController,
    EconomicforumPostsCommentsMetricsController,
    EconomicforumPostsModerationSummaryController,
    EconomicforumPostsAnalyticsController,
    EconomicforumPostsAttachmentsController,
    EconomicforumAdminAttachment_filesSummaryController,
  ],
})
export class MyModule {}
