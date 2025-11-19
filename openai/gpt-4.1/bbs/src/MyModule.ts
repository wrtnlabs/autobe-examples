import { Module } from "@nestjs/common";

import { AuthUserController } from "./controllers/auth/user/AuthUserController";
import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { DiscussionboardAdminSystemconfigsController } from "./controllers/discussionBoard/admin/systemConfigs/DiscussionboardAdminSystemconfigsController";
import { DiscussionboardAdminUsersController } from "./controllers/discussionBoard/admin/users/DiscussionboardAdminUsersController";
import { DiscussionboardUserUsersController } from "./controllers/discussionBoard/user/users/DiscussionboardUserUsersController";
import { DiscussionboardAdminUsersSessionsController } from "./controllers/discussionBoard/admin/users/sessions/DiscussionboardAdminUsersSessionsController";
import { DiscussionboardAdminAdminsController } from "./controllers/discussionBoard/admin/admins/DiscussionboardAdminAdminsController";
import { DiscussionboardAdminAdminsSessionsController } from "./controllers/discussionBoard/admin/admins/sessions/DiscussionboardAdminAdminsSessionsController";
import { DiscussionboardArticlesController } from "./controllers/discussionBoard/articles/DiscussionboardArticlesController";
import { DiscussionboardUserArticlesController } from "./controllers/discussionBoard/user/articles/DiscussionboardUserArticlesController";
import { DiscussionboardAdminArticlesController } from "./controllers/discussionBoard/admin/articles/DiscussionboardAdminArticlesController";
import { DiscussionboardArticlesAttachmentsController } from "./controllers/discussionBoard/articles/attachments/DiscussionboardArticlesAttachmentsController";
import { DiscussionboardUserArticlesAttachmentsController } from "./controllers/discussionBoard/user/articles/attachments/DiscussionboardUserArticlesAttachmentsController";
import { DiscussionboardAdminArticlesAttachmentsController } from "./controllers/discussionBoard/admin/articles/attachments/DiscussionboardAdminArticlesAttachmentsController";
import { DiscussionboardCommentsController } from "./controllers/discussionBoard/comments/DiscussionboardCommentsController";
import { DiscussionboardUserCommentsController } from "./controllers/discussionBoard/user/comments/DiscussionboardUserCommentsController";
import { DiscussionboardAdminCommentsController } from "./controllers/discussionBoard/admin/comments/DiscussionboardAdminCommentsController";
import { DiscussionboardAdminModerationlogsController } from "./controllers/discussionBoard/admin/moderationLogs/DiscussionboardAdminModerationlogsController";
import { DiscussionboardAdminAttachmentsController } from "./controllers/discussionBoard/admin/attachments/DiscussionboardAdminAttachmentsController";

@Module({
  controllers: [
    AuthUserController,
    AuthAdminController,
    DiscussionboardAdminSystemconfigsController,
    DiscussionboardAdminUsersController,
    DiscussionboardUserUsersController,
    DiscussionboardAdminUsersSessionsController,
    DiscussionboardAdminAdminsController,
    DiscussionboardAdminAdminsSessionsController,
    DiscussionboardArticlesController,
    DiscussionboardUserArticlesController,
    DiscussionboardAdminArticlesController,
    DiscussionboardArticlesAttachmentsController,
    DiscussionboardUserArticlesAttachmentsController,
    DiscussionboardAdminArticlesAttachmentsController,
    DiscussionboardCommentsController,
    DiscussionboardUserCommentsController,
    DiscussionboardAdminCommentsController,
    DiscussionboardAdminModerationlogsController,
    DiscussionboardAdminAttachmentsController,
  ],
})
export class MyModule {}
