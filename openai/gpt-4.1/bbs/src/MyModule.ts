import { Module } from "@nestjs/common";

import { AuthUserController } from "./controllers/auth/user/AuthUserController";
import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { DiscussionboardAdminSystemsettingsController } from "./controllers/discussionBoard/admin/systemSettings/DiscussionboardAdminSystemsettingsController";
import { DiscussionboardAdminUsersController } from "./controllers/discussionBoard/admin/users/DiscussionboardAdminUsersController";
import { DiscussionboardAdminUsersSessionsController } from "./controllers/discussionBoard/admin/users/sessions/DiscussionboardAdminUsersSessionsController";
import { DiscussionboardAdminAdminsController } from "./controllers/discussionBoard/admin/admins/DiscussionboardAdminAdminsController";
import { DiscussionboardAdminAdminsSessionsController } from "./controllers/discussionBoard/admin/admins/sessions/DiscussionboardAdminAdminsSessionsController";
import { DiscussionboardArticlesController } from "./controllers/discussionBoard/articles/DiscussionboardArticlesController";
import { DiscussionboardUserArticlesController } from "./controllers/discussionBoard/user/articles/DiscussionboardUserArticlesController";
import { DiscussionboardAdminArticlesController } from "./controllers/discussionBoard/admin/articles/DiscussionboardAdminArticlesController";
import { DiscussionboardArticlesAttachmentsController } from "./controllers/discussionBoard/articles/attachments/DiscussionboardArticlesAttachmentsController";
import { DiscussionboardUserArticlesAttachmentsController } from "./controllers/discussionBoard/user/articles/attachments/DiscussionboardUserArticlesAttachmentsController";
import { DiscussionboardAdminArticlesAttachmentsController } from "./controllers/discussionBoard/admin/articles/attachments/DiscussionboardAdminArticlesAttachmentsController";
import { DiscussionboardUserArticlesSnapshotsController } from "./controllers/discussionBoard/user/articles/snapshots/DiscussionboardUserArticlesSnapshotsController";
import { DiscussionboardAdminArticlesSnapshotsController } from "./controllers/discussionBoard/admin/articles/snapshots/DiscussionboardAdminArticlesSnapshotsController";
import { DiscussionboardArticlesSnapshotsController } from "./controllers/discussionBoard/articles/snapshots/DiscussionboardArticlesSnapshotsController";
import { DiscussionboardCommentsController } from "./controllers/discussionBoard/comments/DiscussionboardCommentsController";
import { DiscussionboardUserCommentsController } from "./controllers/discussionBoard/user/comments/DiscussionboardUserCommentsController";
import { DiscussionboardAdminCommentsController } from "./controllers/discussionBoard/admin/comments/DiscussionboardAdminCommentsController";
import { DiscussionboardUserCommentsAttachmentsController } from "./controllers/discussionBoard/user/comments/attachments/DiscussionboardUserCommentsAttachmentsController";
import { DiscussionboardAdminCommentsAttachmentsController } from "./controllers/discussionBoard/admin/comments/attachments/DiscussionboardAdminCommentsAttachmentsController";
import { DiscussionboardAdminModerationReportsController } from "./controllers/discussionBoard/admin/moderation/reports/DiscussionboardAdminModerationReportsController";
import { DiscussionboardUserModerationReportsController } from "./controllers/discussionBoard/user/moderation/reports/DiscussionboardUserModerationReportsController";
import { DiscussionboardAdminModerationLogsController } from "./controllers/discussionBoard/admin/moderation/logs/DiscussionboardAdminModerationLogsController";

@Module({
  controllers: [
    AuthUserController,
    AuthAdminController,
    DiscussionboardAdminSystemsettingsController,
    DiscussionboardAdminUsersController,
    DiscussionboardAdminUsersSessionsController,
    DiscussionboardAdminAdminsController,
    DiscussionboardAdminAdminsSessionsController,
    DiscussionboardArticlesController,
    DiscussionboardUserArticlesController,
    DiscussionboardAdminArticlesController,
    DiscussionboardArticlesAttachmentsController,
    DiscussionboardUserArticlesAttachmentsController,
    DiscussionboardAdminArticlesAttachmentsController,
    DiscussionboardUserArticlesSnapshotsController,
    DiscussionboardAdminArticlesSnapshotsController,
    DiscussionboardArticlesSnapshotsController,
    DiscussionboardCommentsController,
    DiscussionboardUserCommentsController,
    DiscussionboardAdminCommentsController,
    DiscussionboardUserCommentsAttachmentsController,
    DiscussionboardAdminCommentsAttachmentsController,
    DiscussionboardAdminModerationReportsController,
    DiscussionboardUserModerationReportsController,
    DiscussionboardAdminModerationLogsController,
  ],
})
export class MyModule {}
