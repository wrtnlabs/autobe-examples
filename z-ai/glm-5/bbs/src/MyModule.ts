import { Module } from "@nestjs/common";

import { DiscussionboardAdminAdmin_request_historiesController } from "./controllers/discussionBoard/admin/admin-request-histories/DiscussionboardAdminAdmin_request_historiesController";
import { DiscussionboardAdminAdmin_requestsController } from "./controllers/discussionBoard/admin/admin-requests/DiscussionboardAdminAdmin_requestsController";
import { DiscussionboardAdminAdministrator_grade_historiesController } from "./controllers/discussionBoard/admin/administrator-grade-histories/DiscussionboardAdminAdministrator_grade_historiesController";
import { DiscussionboardAdminAdminsController } from "./controllers/discussionBoard/admin/admins/DiscussionboardAdminAdminsController";
import { DiscussionboardAdminArticlesController } from "./controllers/discussionBoard/admin/articles/DiscussionboardAdminArticlesController";
import { DiscussionboardAdminArticlesAttachmentsController } from "./controllers/discussionBoard/admin/articles/attachments/DiscussionboardAdminArticlesAttachmentsController";
import { DiscussionboardAdminArticlesCommentsController } from "./controllers/discussionBoard/admin/articles/comments/DiscussionboardAdminArticlesCommentsController";
import { DiscussionboardAdminAudit_logsController } from "./controllers/discussionBoard/admin/audit-logs/DiscussionboardAdminAudit_logsController";
import { DiscussionboardAdminDashboardController } from "./controllers/discussionBoard/admin/dashboard/DiscussionboardAdminDashboardController";
import { DiscussionboardAdminSectionsController } from "./controllers/discussionBoard/admin/sections/DiscussionboardAdminSectionsController";
import { DiscussionboardArticlesController } from "./controllers/discussionBoard/articles/DiscussionboardArticlesController";
import { DiscussionboardArticlesAttachmentsController } from "./controllers/discussionBoard/articles/attachments/DiscussionboardArticlesAttachmentsController";
import { DiscussionboardArticlesCommentsController } from "./controllers/discussionBoard/articles/comments/DiscussionboardArticlesCommentsController";
import { DiscussionboardAuthAdminController } from "./controllers/discussionBoard/auth/admin/DiscussionboardAuthAdminController";
import { DiscussionboardAuthGuestController } from "./controllers/discussionBoard/auth/guest/DiscussionboardAuthGuestController";
import { DiscussionboardAuthMemberController } from "./controllers/discussionBoard/auth/member/DiscussionboardAuthMemberController";
import { DiscussionboardMemberAdmin_requestsController } from "./controllers/discussionBoard/member/admin-requests/DiscussionboardMemberAdmin_requestsController";
import { DiscussionboardMemberArticlesController } from "./controllers/discussionBoard/member/articles/DiscussionboardMemberArticlesController";
import { DiscussionboardMemberArticlesAttachmentsController } from "./controllers/discussionBoard/member/articles/attachments/DiscussionboardMemberArticlesAttachmentsController";
import { DiscussionboardMemberArticlesCommentsController } from "./controllers/discussionBoard/member/articles/comments/DiscussionboardMemberArticlesCommentsController";
import { DiscussionboardMemberPassword_resetsController } from "./controllers/discussionBoard/member/password-resets/DiscussionboardMemberPassword_resetsController";
import { DiscussionboardMemberProfileController } from "./controllers/discussionBoard/member/profile/DiscussionboardMemberProfileController";
import { DiscussionboardMemberSessionsController } from "./controllers/discussionBoard/member/sessions/DiscussionboardMemberSessionsController";
import { DiscussionboardMembersController } from "./controllers/discussionBoard/members/DiscussionboardMembersController";
import { DiscussionboardSectionsController } from "./controllers/discussionBoard/sections/DiscussionboardSectionsController";
import { DiscussionboardTagsController } from "./controllers/discussionBoard/tags/DiscussionboardTagsController";

@Module({
  controllers: [
    DiscussionboardAuthGuestController,
    DiscussionboardAuthMemberController,
    DiscussionboardAuthAdminController,
    DiscussionboardMembersController,
    DiscussionboardMemberProfileController,
    DiscussionboardMemberSessionsController,
    DiscussionboardMemberPassword_resetsController,
    DiscussionboardAdminAdminsController,
    DiscussionboardAdminAudit_logsController,
    DiscussionboardArticlesController,
    DiscussionboardMemberArticlesController,
    DiscussionboardAdminArticlesController,
    DiscussionboardTagsController,
    DiscussionboardArticlesAttachmentsController,
    DiscussionboardMemberArticlesAttachmentsController,
    DiscussionboardAdminArticlesAttachmentsController,
    DiscussionboardSectionsController,
    DiscussionboardAdminSectionsController,
    DiscussionboardArticlesCommentsController,
    DiscussionboardMemberArticlesCommentsController,
    DiscussionboardAdminArticlesCommentsController,
    DiscussionboardMemberAdmin_requestsController,
    DiscussionboardAdminAdmin_requestsController,
    DiscussionboardAdminAdmin_request_historiesController,
    DiscussionboardAdminAdministrator_grade_historiesController,
    DiscussionboardAdminDashboardController,
  ],
})
export class MyModule {}
