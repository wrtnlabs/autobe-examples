import { Module } from "@nestjs/common";

import { AuthCitizenController } from "./controllers/auth/citizen/AuthCitizenController";
import { AuthModeratorController } from "./controllers/auth/moderator/AuthModeratorController";
import { EconomicboardSettingsCategoriesController } from "./controllers/economicBoard/settings/categories/EconomicboardSettingsCategoriesController";
import { EconomicboardModeratorSettingsConfigController } from "./controllers/economicBoard/moderator/settings/config/EconomicboardModeratorSettingsConfigController";
import { EconomicboardSettingsTimezonesController } from "./controllers/economicBoard/settings/timezones/EconomicboardSettingsTimezonesController";
import { EconomicboardModeratorSettingsContentflagsController } from "./controllers/economicBoard/moderator/settings/contentFlags/EconomicboardModeratorSettingsContentflagsController";
import { EconomicboardModeratorCitizensController } from "./controllers/economicBoard/moderator/citizens/EconomicboardModeratorCitizensController";
import { EconomicboardModeratorModeratorsController } from "./controllers/economicBoard/moderator/moderators/EconomicboardModeratorModeratorsController";
import { EconomicboardPostsController } from "./controllers/economicBoard/posts/EconomicboardPostsController";
import { EconomicboardCitizenPostsController } from "./controllers/economicBoard/citizen/posts/EconomicboardCitizenPostsController";
import { EconomicboardModeratorPostsController } from "./controllers/economicBoard/moderator/posts/EconomicboardModeratorPostsController";
import { EconomicboardCitizenPostsAttachmentsController } from "./controllers/economicBoard/citizen/posts/attachments/EconomicboardCitizenPostsAttachmentsController";
import { EconomicboardModeratorPostsAttachmentsController } from "./controllers/economicBoard/moderator/posts/attachments/EconomicboardModeratorPostsAttachmentsController";
import { PostsAttachmentsController } from "./controllers/posts/attachments/PostsAttachmentsController";
import { EconomicboardPostsAttachmentsController } from "./controllers/economicBoard/posts/attachments/EconomicboardPostsAttachmentsController";
import { EconomicboardPostsCommentsController } from "./controllers/economicBoard/posts/comments/EconomicboardPostsCommentsController";
import { EconomicboardCitizenPostsCommentsController } from "./controllers/economicBoard/citizen/posts/comments/EconomicboardCitizenPostsCommentsController";
import { EconomicboardModeratorPostsCommentsController } from "./controllers/economicBoard/moderator/posts/comments/EconomicboardModeratorPostsCommentsController";
import { EconomicboardCommentsController } from "./controllers/economicBoard/comments/EconomicboardCommentsController";
import { EconomicboardCitizenCommentsController } from "./controllers/economicBoard/citizen/comments/EconomicboardCitizenCommentsController";
import { EconomicboardModeratorCommentsController } from "./controllers/economicBoard/moderator/comments/EconomicboardModeratorCommentsController";
import { EconomicboardModeratorModerationActionsController } from "./controllers/economicBoard/moderator/moderation/actions/EconomicboardModeratorModerationActionsController";
import { EconomicboardController } from "./controllers/economicBoard/search/EconomicboardController";

@Module({
  controllers: [
    AuthCitizenController,
    AuthModeratorController,
    EconomicboardSettingsCategoriesController,
    EconomicboardModeratorSettingsConfigController,
    EconomicboardSettingsTimezonesController,
    EconomicboardModeratorSettingsContentflagsController,
    EconomicboardModeratorCitizensController,
    EconomicboardModeratorModeratorsController,
    EconomicboardPostsController,
    EconomicboardCitizenPostsController,
    EconomicboardModeratorPostsController,
    EconomicboardCitizenPostsAttachmentsController,
    EconomicboardModeratorPostsAttachmentsController,
    PostsAttachmentsController,
    EconomicboardPostsAttachmentsController,
    EconomicboardPostsCommentsController,
    EconomicboardCitizenPostsCommentsController,
    EconomicboardModeratorPostsCommentsController,
    EconomicboardCommentsController,
    EconomicboardCitizenCommentsController,
    EconomicboardModeratorCommentsController,
    EconomicboardModeratorModerationActionsController,
    EconomicboardController,
  ],
})
export class MyModule {}
