import { Module } from "@nestjs/common";

import { AuthRegistered_userController } from "./controllers/auth/registered-user/AuthRegistered_userController";
import { AuthModeratorController } from "./controllers/auth/moderator/AuthModeratorController";
import { AuthGuestController } from "./controllers/auth/guest/AuthGuestController";
import { DiscussionboardArticlesController } from "./controllers/discussionBoard/articles/DiscussionboardArticlesController";
import { DiscussionboardRegistereduserArticlesController } from "./controllers/discussionBoard/registeredUser/articles/DiscussionboardRegistereduserArticlesController";
import { DiscussionboardModeratorArticlesController } from "./controllers/discussionBoard/moderator/articles/DiscussionboardModeratorArticlesController";
import { DiscussionboardArticlesAttachmentsController } from "./controllers/discussionBoard/articles/attachments/DiscussionboardArticlesAttachmentsController";
import { DiscussionboardModeratorArticlesAttachmentsController } from "./controllers/discussionBoard/moderator/articles/attachments/DiscussionboardModeratorArticlesAttachmentsController";
import { DiscussionboardModeratorArticlesVersionsController } from "./controllers/discussionBoard/moderator/articles/versions/DiscussionboardModeratorArticlesVersionsController";
import { DiscussionboardArticlesVersionsController } from "./controllers/discussionBoard/articles/versions/DiscussionboardArticlesVersionsController";
import { DiscussionboardCommentsController } from "./controllers/discussionBoard/comments/DiscussionboardCommentsController";
import { DiscussionboardRegistereduserCommentsController } from "./controllers/discussionBoard/registeredUser/comments/DiscussionboardRegistereduserCommentsController";
import { DiscussionboardModeratorCommentsController } from "./controllers/discussionBoard/moderator/comments/DiscussionboardModeratorCommentsController";
import { DiscussionboardCommentsRepliesController } from "./controllers/discussionBoard/comments/replies/DiscussionboardCommentsRepliesController";
import { DiscussionboardRegistereduserCommentsRepliesController } from "./controllers/discussionBoard/registeredUser/comments/replies/DiscussionboardRegistereduserCommentsRepliesController";
import { DiscussionboardModeratorCommentsRepliesController } from "./controllers/discussionBoard/moderator/comments/replies/DiscussionboardModeratorCommentsRepliesController";
import { DiscussionboardModeratorReportedcontentController } from "./controllers/discussionBoard/moderator/reportedContent/DiscussionboardModeratorReportedcontentController";
import { DiscussionboardModeratorReportedcontentModerationactionsController } from "./controllers/discussionBoard/moderator/reportedContent/moderationActions/DiscussionboardModeratorReportedcontentModerationactionsController";
import { DiscussionboardModeratorModerationactionsController } from "./controllers/discussionBoard/moderator/moderationActions/DiscussionboardModeratorModerationactionsController";
import { DiscussionboardModeratorModeratorsController } from "./controllers/discussionBoard/moderator/moderators/DiscussionboardModeratorModeratorsController";
import { DiscussionboardModeratorModeratorsModerationactionsController } from "./controllers/discussionBoard/moderator/moderators/moderationActions/DiscussionboardModeratorModeratorsModerationactionsController";
import { DiscussionboardModeratorRegisteredusersController } from "./controllers/discussionBoard/moderator/registeredUsers/DiscussionboardModeratorRegisteredusersController";
import { DiscussionboardRegistereduserRegisteredusersController } from "./controllers/discussionBoard/registeredUser/registeredUsers/DiscussionboardRegistereduserRegisteredusersController";
import { DiscussionboardRegisteredusersController } from "./controllers/discussionBoard/registeredUsers/DiscussionboardRegisteredusersController";
import { DiscussionboardRegistereduserRegisteredusersSessionsController } from "./controllers/discussionBoard/registeredUser/registeredUsers/sessions/DiscussionboardRegistereduserRegisteredusersSessionsController";
import { DiscussionboardModeratorSystemConfigurationsController } from "./controllers/discussionBoard/moderator/system/configurations/DiscussionboardModeratorSystemConfigurationsController";
import { DiscussionboardRegistereduserSystemConfigurationsController } from "./controllers/discussionBoard/registeredUser/system/configurations/DiscussionboardRegistereduserSystemConfigurationsController";

@Module({
  controllers: [
    AuthRegistered_userController,
    AuthModeratorController,
    AuthGuestController,
    DiscussionboardArticlesController,
    DiscussionboardRegistereduserArticlesController,
    DiscussionboardModeratorArticlesController,
    DiscussionboardArticlesAttachmentsController,
    DiscussionboardModeratorArticlesAttachmentsController,
    DiscussionboardModeratorArticlesVersionsController,
    DiscussionboardArticlesVersionsController,
    DiscussionboardCommentsController,
    DiscussionboardRegistereduserCommentsController,
    DiscussionboardModeratorCommentsController,
    DiscussionboardCommentsRepliesController,
    DiscussionboardRegistereduserCommentsRepliesController,
    DiscussionboardModeratorCommentsRepliesController,
    DiscussionboardModeratorReportedcontentController,
    DiscussionboardModeratorReportedcontentModerationactionsController,
    DiscussionboardModeratorModerationactionsController,
    DiscussionboardModeratorModeratorsController,
    DiscussionboardModeratorModeratorsModerationactionsController,
    DiscussionboardModeratorRegisteredusersController,
    DiscussionboardRegistereduserRegisteredusersController,
    DiscussionboardRegisteredusersController,
    DiscussionboardRegistereduserRegisteredusersSessionsController,
    DiscussionboardModeratorSystemConfigurationsController,
    DiscussionboardRegistereduserSystemConfigurationsController,
  ],
})
export class MyModule {}
