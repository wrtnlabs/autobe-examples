import { Module } from "@nestjs/common";

import { AuthCitizenController } from "./controllers/auth/citizen/AuthCitizenController";
import { AuthModeratorController } from "./controllers/auth/moderator/AuthModeratorController";
import { DiscussionboardSystemConfigController } from "./controllers/discussionBoard/system/config/DiscussionboardSystemConfigController";
import { DiscussionboardModeratorSystemConfigController } from "./controllers/discussionBoard/moderator/system/config/DiscussionboardModeratorSystemConfigController";
import { DiscussionboardAuthCitizenJoinController } from "./controllers/discussionBoard/auth/citizen/join/DiscussionboardAuthCitizenJoinController";
import { DiscussionboardAuthCitizenLoginController } from "./controllers/discussionBoard/auth/citizen/login/DiscussionboardAuthCitizenLoginController";
import { DiscussionboardAuthCitizenRefreshController } from "./controllers/discussionBoard/auth/citizen/refresh/DiscussionboardAuthCitizenRefreshController";
import { DiscussionboardAuthModeratorJoinController } from "./controllers/discussionBoard/auth/moderator/join/DiscussionboardAuthModeratorJoinController";
import { DiscussionboardAuthModeratorLoginController } from "./controllers/discussionBoard/auth/moderator/login/DiscussionboardAuthModeratorLoginController";
import { DiscussionboardModeratorAuthModeratorController } from "./controllers/discussionBoard/moderator/auth/moderator/refresh/DiscussionboardModeratorAuthModeratorController";
import { DiscussionboardPostsController } from "./controllers/discussionBoard/posts/DiscussionboardPostsController";
import { DiscussionboardCitizenPostsController } from "./controllers/discussionBoard/citizen/posts/DiscussionboardCitizenPostsController";
import { DiscussionboardModeratorPostsController } from "./controllers/discussionBoard/moderator/posts/DiscussionboardModeratorPostsController";
import { DiscussionboardCitizenPostsCommentsController } from "./controllers/discussionBoard/citizen/posts/comments/DiscussionboardCitizenPostsCommentsController";
import { DiscussionboardModeratorPostsCommentsController } from "./controllers/discussionBoard/moderator/posts/comments/DiscussionboardModeratorPostsCommentsController";
import { DiscussionboardPostsCommentsController } from "./controllers/discussionBoard/posts/comments/DiscussionboardPostsCommentsController";
import { DiscussionboardPostsAttachmentsController } from "./controllers/discussionBoard/posts/attachments/DiscussionboardPostsAttachmentsController";
import { DiscussionboardModeratorPostsAttachmentsController } from "./controllers/discussionBoard/moderator/posts/attachments/DiscussionboardModeratorPostsAttachmentsController";
import { DiscussionboardSearchPostsController } from "./controllers/discussionBoard/search/posts/DiscussionboardSearchPostsController";
import { DiscussionboardCommentsController } from "./controllers/discussionBoard/comments/DiscussionboardCommentsController";
import { DiscussionboardCitizenCommentsController } from "./controllers/discussionBoard/citizen/comments/DiscussionboardCitizenCommentsController";
import { DiscussionboardModeratorCommentsController } from "./controllers/discussionBoard/moderator/comments/DiscussionboardModeratorCommentsController";
import { DiscussionboardCitizenAttachmentfilesController } from "./controllers/discussionBoard/citizen/attachmentFiles/DiscussionboardCitizenAttachmentfilesController";
import { DiscussionboardModeratorAttachmentfilesController } from "./controllers/discussionBoard/moderator/attachmentFiles/DiscussionboardModeratorAttachmentfilesController";
import { DiscussionboardAttachmentfilesController } from "./controllers/discussionBoard/attachmentFiles/DiscussionboardAttachmentfilesController";
import { DiscussionboardModeratorReportsController } from "./controllers/discussionBoard/moderator/reports/DiscussionboardModeratorReportsController";
import { DiscussionboardModeratorModeration_actionsController } from "./controllers/discussionBoard/moderator/moderation-actions/DiscussionboardModeratorModeration_actionsController";

@Module({
  controllers: [
    AuthCitizenController,
    AuthModeratorController,
    DiscussionboardSystemConfigController,
    DiscussionboardModeratorSystemConfigController,
    DiscussionboardAuthCitizenJoinController,
    DiscussionboardAuthCitizenLoginController,
    DiscussionboardAuthCitizenRefreshController,
    DiscussionboardAuthModeratorJoinController,
    DiscussionboardAuthModeratorLoginController,
    DiscussionboardModeratorAuthModeratorController,
    DiscussionboardPostsController,
    DiscussionboardCitizenPostsController,
    DiscussionboardModeratorPostsController,
    DiscussionboardCitizenPostsCommentsController,
    DiscussionboardModeratorPostsCommentsController,
    DiscussionboardPostsCommentsController,
    DiscussionboardPostsAttachmentsController,
    DiscussionboardModeratorPostsAttachmentsController,
    DiscussionboardSearchPostsController,
    DiscussionboardCommentsController,
    DiscussionboardCitizenCommentsController,
    DiscussionboardModeratorCommentsController,
    DiscussionboardCitizenAttachmentfilesController,
    DiscussionboardModeratorAttachmentfilesController,
    DiscussionboardAttachmentfilesController,
    DiscussionboardModeratorReportsController,
    DiscussionboardModeratorModeration_actionsController,
  ],
})
export class MyModule {}
