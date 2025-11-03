import { Module } from "@nestjs/common";

import { AuthGuestController } from "./controllers/auth/guest/AuthGuestController";
import { AuthMemberController } from "./controllers/auth/member/AuthMemberController";
import { AuthModeratorController } from "./controllers/auth/moderator/AuthModeratorController";
import { DiscussionboardAuthController } from "./controllers/discussionBoard/auth/register/DiscussionboardAuthController";
import { DiscussionboardAuthLoginController } from "./controllers/discussionBoard/auth/login/DiscussionboardAuthLoginController";
import { DiscussionboardMemberAuthController } from "./controllers/discussionBoard/member/auth/logout/DiscussionboardMemberAuthController";
import { DiscussionboardAuthPassword_resetController } from "./controllers/discussionBoard/auth/password-reset/DiscussionboardAuthPassword_resetController";
import { DiscussionboardAuthVerify_emailController } from "./controllers/discussionBoard/auth/verify-email/DiscussionboardAuthVerify_emailController";
import { DiscussionboardAuthPassword_reset_confirmController } from "./controllers/discussionBoard/auth/password-reset-confirm/DiscussionboardAuthPassword_reset_confirmController";
import { DiscussionboardAuthResend_verificationController } from "./controllers/discussionBoard/auth/resend-verification/DiscussionboardAuthResend_verificationController";
import { DiscussionboardMemberAuthChange_passwordController } from "./controllers/discussionBoard/member/auth/change-password/DiscussionboardMemberAuthChange_passwordController";
import { DiscussionboardMemberAuthSessionsController } from "./controllers/discussionBoard/member/auth/sessions/DiscussionboardMemberAuthSessionsController";
import { DiscussionboardModeratorAuthSessionsController } from "./controllers/discussionBoard/moderator/auth/sessions/DiscussionboardModeratorAuthSessionsController";
import { DiscussionboardCategoriesController } from "./controllers/discussionBoard/categories/DiscussionboardCategoriesController";
import { DiscussionboardArticlesController } from "./controllers/discussionBoard/articles/DiscussionboardArticlesController";
import { DiscussionboardMemberArticlesController } from "./controllers/discussionBoard/member/articles/DiscussionboardMemberArticlesController";
import { DiscussionboardModeratorArticlesController } from "./controllers/discussionBoard/moderator/articles/DiscussionboardModeratorArticlesController";
import { DiscussionboardArticlesCommentsController } from "./controllers/discussionBoard/articles/comments/DiscussionboardArticlesCommentsController";
import { DiscussionboardMemberArticlesCommentsController } from "./controllers/discussionBoard/member/articles/comments/DiscussionboardMemberArticlesCommentsController";
import { DiscussionboardModeratorArticlesCommentsController } from "./controllers/discussionBoard/moderator/articles/comments/DiscussionboardModeratorArticlesCommentsController";
import { DiscussionboardArticlesRevisionsController } from "./controllers/discussionBoard/articles/revisions/DiscussionboardArticlesRevisionsController";
import { DiscussionboardArticlesAttachmentsController } from "./controllers/discussionBoard/articles/attachments/DiscussionboardArticlesAttachmentsController";
import { DiscussionboardMemberArticlesAttachmentsController } from "./controllers/discussionBoard/member/articles/attachments/DiscussionboardMemberArticlesAttachmentsController";
import { DiscussionboardModeratorArticlesAttachmentsController } from "./controllers/discussionBoard/moderator/articles/attachments/DiscussionboardModeratorArticlesAttachmentsController";
import { DiscussionboardSearchArticlesController } from "./controllers/discussionBoard/search/articles/DiscussionboardSearchArticlesController";
import { DiscussionboardCommentsRepliesController } from "./controllers/discussionBoard/comments/replies/DiscussionboardCommentsRepliesController";
import { DiscussionboardMemberCommentsRepliesController } from "./controllers/discussionBoard/member/comments/replies/DiscussionboardMemberCommentsRepliesController";
import { DiscussionboardAttachmentsController } from "./controllers/discussionBoard/attachments/download/DiscussionboardAttachmentsController";
import { DiscussionboardMemberAttachmentsSecurity_statusController } from "./controllers/discussionBoard/member/attachments/security-status/DiscussionboardMemberAttachmentsSecurity_statusController";
import { DiscussionboardModeratorAttachmentsSecurity_statusController } from "./controllers/discussionBoard/moderator/attachments/security-status/DiscussionboardModeratorAttachmentsSecurity_statusController";
import { DiscussionboardModeratorModerationContentController } from "./controllers/discussionBoard/moderator/moderation/content/DiscussionboardModeratorModerationContentController";
import { DiscussionboardModeratorModerationArticlesController } from "./controllers/discussionBoard/moderator/moderation/articles/DiscussionboardModeratorModerationArticlesController";
import { DiscussionboardModeratorModerationCommentsController } from "./controllers/discussionBoard/moderator/moderation/comments/DiscussionboardModeratorModerationCommentsController";
import { DiscussionboardModeratorModerationMembersController } from "./controllers/discussionBoard/moderator/moderation/members/DiscussionboardModeratorModerationMembersController";
import { DiscussionboardModeratorModerationLogsController } from "./controllers/discussionBoard/moderator/moderation/logs/DiscussionboardModeratorModerationLogsController";
import { DiscussionboardModeratorModerationController } from "./controllers/discussionBoard/moderator/moderation/dashboard/DiscussionboardModeratorModerationController";
import { DiscussionboardMemberNotificationsController } from "./controllers/discussionBoard/member/notifications/DiscussionboardMemberNotificationsController";
import { DiscussionboardMemberNotificationsBulkReadController } from "./controllers/discussionBoard/member/notifications/bulk/read/DiscussionboardMemberNotificationsBulkReadController";
import { DiscussionboardMemberNotificationsUnread_countController } from "./controllers/discussionBoard/member/notifications/unread-count/DiscussionboardMemberNotificationsUnread_countController";
import { DiscussionboardMemberMeController } from "./controllers/discussionBoard/member/me/profile/DiscussionboardMemberMeController";
import { DiscussionboardMemberMe_profileController } from "./controllers/discussionBoard/member/me/profile/DiscussionboardMemberMe_profileController";
import { DiscussionboardMemberMeArticlesController } from "./controllers/discussionBoard/member/me/articles/DiscussionboardMemberMeArticlesController";
import { DiscussionboardMemberMeCommentsController } from "./controllers/discussionBoard/member/me/comments/DiscussionboardMemberMeCommentsController";

@Module({
  controllers: [
    AuthGuestController,
    AuthMemberController,
    AuthModeratorController,
    DiscussionboardAuthController,
    DiscussionboardAuthLoginController,
    DiscussionboardMemberAuthController,
    DiscussionboardAuthPassword_resetController,
    DiscussionboardAuthVerify_emailController,
    DiscussionboardAuthPassword_reset_confirmController,
    DiscussionboardAuthResend_verificationController,
    DiscussionboardMemberAuthChange_passwordController,
    DiscussionboardMemberAuthSessionsController,
    DiscussionboardModeratorAuthSessionsController,
    DiscussionboardCategoriesController,
    DiscussionboardArticlesController,
    DiscussionboardMemberArticlesController,
    DiscussionboardModeratorArticlesController,
    DiscussionboardArticlesCommentsController,
    DiscussionboardMemberArticlesCommentsController,
    DiscussionboardModeratorArticlesCommentsController,
    DiscussionboardArticlesRevisionsController,
    DiscussionboardArticlesAttachmentsController,
    DiscussionboardMemberArticlesAttachmentsController,
    DiscussionboardModeratorArticlesAttachmentsController,
    DiscussionboardSearchArticlesController,
    DiscussionboardCommentsRepliesController,
    DiscussionboardMemberCommentsRepliesController,
    DiscussionboardAttachmentsController,
    DiscussionboardMemberAttachmentsSecurity_statusController,
    DiscussionboardModeratorAttachmentsSecurity_statusController,
    DiscussionboardModeratorModerationContentController,
    DiscussionboardModeratorModerationArticlesController,
    DiscussionboardModeratorModerationCommentsController,
    DiscussionboardModeratorModerationMembersController,
    DiscussionboardModeratorModerationLogsController,
    DiscussionboardModeratorModerationController,
    DiscussionboardMemberNotificationsController,
    DiscussionboardMemberNotificationsBulkReadController,
    DiscussionboardMemberNotificationsUnread_countController,
    DiscussionboardMemberMeController,
    DiscussionboardMemberMe_profileController,
    DiscussionboardMemberMeArticlesController,
    DiscussionboardMemberMeCommentsController,
  ],
})
export class MyModule {}
