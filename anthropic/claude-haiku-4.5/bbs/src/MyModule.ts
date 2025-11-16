import { Module } from "@nestjs/common";

import { AuthGuestController } from "./controllers/auth/guest/AuthGuestController";
import { AuthMemberController } from "./controllers/auth/member/AuthMemberController";
import { AuthModeratorController } from "./controllers/auth/moderator/AuthModeratorController";
import { DiscussionboardArticlesController } from "./controllers/discussionBoard/articles/DiscussionboardArticlesController";
import { DiscussionboardMemberArticlesController } from "./controllers/discussionBoard/member/articles/DiscussionboardMemberArticlesController";
import { DiscussionboardModeratorArticlesController } from "./controllers/discussionBoard/moderator/articles/DiscussionboardModeratorArticlesController";
import { DiscussionboardArticlesCommentsController } from "./controllers/discussionBoard/articles/comments/DiscussionboardArticlesCommentsController";
import { DiscussionboardMemberArticlesCommentsController } from "./controllers/discussionBoard/member/articles/comments/DiscussionboardMemberArticlesCommentsController";
import { DiscussionboardModeratorArticlesCommentsController } from "./controllers/discussionBoard/moderator/articles/comments/DiscussionboardModeratorArticlesCommentsController";
import { DiscussionboardMemberArticlesAttachmentsController } from "./controllers/discussionBoard/member/articles/attachments/DiscussionboardMemberArticlesAttachmentsController";
import { DiscussionboardArticlesAttachmentsController } from "./controllers/discussionBoard/articles/attachments/DiscussionboardArticlesAttachmentsController";
import { DiscussionboardCategoriesController } from "./controllers/discussionBoard/categories/DiscussionboardCategoriesController";
import { DiscussionboardModeratorCategoriesController } from "./controllers/discussionBoard/moderator/categories/DiscussionboardModeratorCategoriesController";
import { DiscussionboardSearchController } from "./controllers/discussionBoard/search/DiscussionboardSearchController";
import { DiscussionboardMembersController } from "./controllers/discussionBoard/members/DiscussionboardMembersController";
import { DiscussionboardMemberMembersController } from "./controllers/discussionBoard/member/members/DiscussionboardMemberMembersController";
import { DiscussionboardMemberprofilesController } from "./controllers/discussionBoard/memberProfiles/DiscussionboardMemberprofilesController";
import { DiscussionboardMemberMemberprofilesController } from "./controllers/discussionBoard/member/memberProfiles/DiscussionboardMemberMemberprofilesController";
import { DiscussionboardMemberMemberpreferencesController } from "./controllers/discussionBoard/member/memberPreferences/DiscussionboardMemberMemberpreferencesController";
import { DiscussionboardMemberMembersPasswordController } from "./controllers/discussionBoard/member/members/password/DiscussionboardMemberMembersPasswordController";
import { DiscussionboardMemberMembersEmailController } from "./controllers/discussionBoard/member/members/email/DiscussionboardMemberMembersEmailController";
import { DiscussionboardMemberMembersProfilepictureController } from "./controllers/discussionBoard/member/members/profilePicture/DiscussionboardMemberMembersProfilepictureController";
import { DiscussionboardMemberAuthMemberController } from "./controllers/discussionBoard/member/auth/member/logout/DiscussionboardMemberAuthMemberController";
import { DiscussionboardMemberAuthMemberVerify_emailController } from "./controllers/discussionBoard/member/auth/member/verify-email/DiscussionboardMemberAuthMemberVerify_emailController";
import { DiscussionboardMemberAuthMemberResend_verificationController } from "./controllers/discussionBoard/member/auth/member/resend-verification/DiscussionboardMemberAuthMemberResend_verificationController";
import { DiscussionboardAuthMemberPassword_reset_requestController } from "./controllers/discussionBoard/auth/member/password-reset-request/DiscussionboardAuthMemberPassword_reset_requestController";
import { DiscussionboardAuthMemberPassword_reset_confirmController } from "./controllers/discussionBoard/auth/member/password-reset-confirm/DiscussionboardAuthMemberPassword_reset_confirmController";
import { DiscussionboardMemberAuthMemberSessionsController } from "./controllers/discussionBoard/member/auth/member/sessions/DiscussionboardMemberAuthMemberSessionsController";
import { DiscussionboardAuthMemberValidate_tokenController } from "./controllers/discussionBoard/auth/member/validate-token/DiscussionboardAuthMemberValidate_tokenController";
import { DiscussionboardMemberSessionsController } from "./controllers/discussionBoard/member/sessions/DiscussionboardMemberSessionsController";
import { DiscussionboardModeratorAuthModeratorController } from "./controllers/discussionBoard/moderator/auth/moderator/logout/DiscussionboardModeratorAuthModeratorController";
import { DiscussionboardModeratorAuthModeratorSessionsController } from "./controllers/discussionBoard/moderator/auth/moderator/sessions/DiscussionboardModeratorAuthModeratorSessionsController";
import { DiscussionboardModeratorAuthModeratorValidate_tokenController } from "./controllers/discussionBoard/moderator/auth/moderator/validate-token/DiscussionboardModeratorAuthModeratorValidate_tokenController";
import { DiscussionboardModeratorMembersController } from "./controllers/discussionBoard/moderator/members/DiscussionboardModeratorMembersController";
import { DiscussionboardModeratorModerationDashboardController } from "./controllers/discussionBoard/moderator/moderation/dashboard/DiscussionboardModeratorModerationDashboardController";
import { DiscussionboardModeratorModerationPending_articlesController } from "./controllers/discussionBoard/moderator/moderation/pending-articles/DiscussionboardModeratorModerationPending_articlesController";
import { DiscussionboardModeratorModerationContent_reportsController } from "./controllers/discussionBoard/moderator/moderation/content-reports/DiscussionboardModeratorModerationContent_reportsController";
import { DiscussionboardModeratorModerationActionsController } from "./controllers/discussionBoard/moderator/moderation/actions/DiscussionboardModeratorModerationActionsController";
import { DiscussionboardModeratorModerationMember_activityController } from "./controllers/discussionBoard/moderator/moderation/member-activity/DiscussionboardModeratorModerationMember_activityController";
import { DiscussionboardMemberReportsController } from "./controllers/discussionBoard/member/reports/DiscussionboardMemberReportsController";
import { DiscussionboardModeratorReportsController } from "./controllers/discussionBoard/moderator/reports/DiscussionboardModeratorReportsController";
import { DiscussionboardMemberArticlesReportsController } from "./controllers/discussionBoard/member/articles/reports/DiscussionboardMemberArticlesReportsController";
import { DiscussionboardMemberCommentsReportsController } from "./controllers/discussionBoard/member/comments/reports/DiscussionboardMemberCommentsReportsController";
import { DiscussionboardModeratorReportsAssignController } from "./controllers/discussionBoard/moderator/reports/assign/DiscussionboardModeratorReportsAssignController";
import { DiscussionboardModeratorReportsNotesController } from "./controllers/discussionBoard/moderator/reports/notes/DiscussionboardModeratorReportsNotesController";
import { DiscussionboardModeratorSystemsettingsController } from "./controllers/discussionBoard/moderator/systemSettings/DiscussionboardModeratorSystemsettingsController";

@Module({
  controllers: [
    AuthGuestController,
    AuthMemberController,
    AuthModeratorController,
    DiscussionboardArticlesController,
    DiscussionboardMemberArticlesController,
    DiscussionboardModeratorArticlesController,
    DiscussionboardArticlesCommentsController,
    DiscussionboardMemberArticlesCommentsController,
    DiscussionboardModeratorArticlesCommentsController,
    DiscussionboardMemberArticlesAttachmentsController,
    DiscussionboardArticlesAttachmentsController,
    DiscussionboardCategoriesController,
    DiscussionboardModeratorCategoriesController,
    DiscussionboardSearchController,
    DiscussionboardMembersController,
    DiscussionboardMemberMembersController,
    DiscussionboardMemberprofilesController,
    DiscussionboardMemberMemberprofilesController,
    DiscussionboardMemberMemberpreferencesController,
    DiscussionboardMemberMembersPasswordController,
    DiscussionboardMemberMembersEmailController,
    DiscussionboardMemberMembersProfilepictureController,
    DiscussionboardMemberAuthMemberController,
    DiscussionboardMemberAuthMemberVerify_emailController,
    DiscussionboardMemberAuthMemberResend_verificationController,
    DiscussionboardAuthMemberPassword_reset_requestController,
    DiscussionboardAuthMemberPassword_reset_confirmController,
    DiscussionboardMemberAuthMemberSessionsController,
    DiscussionboardAuthMemberValidate_tokenController,
    DiscussionboardMemberSessionsController,
    DiscussionboardModeratorAuthModeratorController,
    DiscussionboardModeratorAuthModeratorSessionsController,
    DiscussionboardModeratorAuthModeratorValidate_tokenController,
    DiscussionboardModeratorMembersController,
    DiscussionboardModeratorModerationDashboardController,
    DiscussionboardModeratorModerationPending_articlesController,
    DiscussionboardModeratorModerationContent_reportsController,
    DiscussionboardModeratorModerationActionsController,
    DiscussionboardModeratorModerationMember_activityController,
    DiscussionboardMemberReportsController,
    DiscussionboardModeratorReportsController,
    DiscussionboardMemberArticlesReportsController,
    DiscussionboardMemberCommentsReportsController,
    DiscussionboardModeratorReportsAssignController,
    DiscussionboardModeratorReportsNotesController,
    DiscussionboardModeratorSystemsettingsController,
  ],
})
export class MyModule {}
