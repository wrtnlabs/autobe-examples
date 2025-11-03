import { Module } from "@nestjs/common";

import { AuthUserController } from "./controllers/auth/user/AuthUserController";
import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { DiscussionboardAdminUsersController } from "./controllers/discussionBoard/admin/users/DiscussionboardAdminUsersController";
import { DiscussionboardUserUsersController } from "./controllers/discussionBoard/user/users/DiscussionboardUserUsersController";
import { DiscussionboardUserUsersSessionsController } from "./controllers/discussionBoard/user/users/sessions/DiscussionboardUserUsersSessionsController";
import { DiscussionboardAdminUsersSessionsController } from "./controllers/discussionBoard/admin/users/sessions/DiscussionboardAdminUsersSessionsController";
import { DiscussionboardAdminAdminsController } from "./controllers/discussionBoard/admin/admins/DiscussionboardAdminAdminsController";
import { DiscussionboardAdminAdminsSessionsController } from "./controllers/discussionBoard/admin/admins/sessions/DiscussionboardAdminAdminsSessionsController";
import { DiscussionboardUserArticlesController } from "./controllers/discussionBoard/user/articles/DiscussionboardUserArticlesController";
import { DiscussionboardAdminArticlesController } from "./controllers/discussionBoard/admin/articles/DiscussionboardAdminArticlesController";
import { DiscussionboardUserArticlesAttachmentsController } from "./controllers/discussionBoard/user/articles/attachments/DiscussionboardUserArticlesAttachmentsController";
import { DiscussionboardAdminArticlesAttachmentsController } from "./controllers/discussionBoard/admin/articles/attachments/DiscussionboardAdminArticlesAttachmentsController";
import { DiscussionboardUserArticlesCommentsController } from "./controllers/discussionBoard/user/articles/comments/DiscussionboardUserArticlesCommentsController";
import { DiscussionboardAdminArticlesCommentsController } from "./controllers/discussionBoard/admin/articles/comments/DiscussionboardAdminArticlesCommentsController";
import { DiscussionboardAdminAbusereportsController } from "./controllers/discussionBoard/admin/abuseReports/DiscussionboardAdminAbusereportsController";
import { DiscussionboardUserAbusereportsController } from "./controllers/discussionBoard/user/abuseReports/DiscussionboardUserAbusereportsController";
import { DiscussionboardAdminModerationactionsController } from "./controllers/discussionBoard/admin/moderationActions/DiscussionboardAdminModerationactionsController";
import { DiscussionboardAdminAuditlogsController } from "./controllers/discussionBoard/admin/auditLogs/DiscussionboardAdminAuditlogsController";

@Module({
  controllers: [
    AuthUserController,
    AuthAdminController,
    DiscussionboardAdminUsersController,
    DiscussionboardUserUsersController,
    DiscussionboardUserUsersSessionsController,
    DiscussionboardAdminUsersSessionsController,
    DiscussionboardAdminAdminsController,
    DiscussionboardAdminAdminsSessionsController,
    DiscussionboardUserArticlesController,
    DiscussionboardAdminArticlesController,
    DiscussionboardUserArticlesAttachmentsController,
    DiscussionboardAdminArticlesAttachmentsController,
    DiscussionboardUserArticlesCommentsController,
    DiscussionboardAdminArticlesCommentsController,
    DiscussionboardAdminAbusereportsController,
    DiscussionboardUserAbusereportsController,
    DiscussionboardAdminModerationactionsController,
    DiscussionboardAdminAuditlogsController,
  ],
})
export class MyModule {}
