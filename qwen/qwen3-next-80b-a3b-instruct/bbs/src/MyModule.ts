import { Module } from "@nestjs/common";

import { AuthCitizenController } from "./controllers/auth/citizen/AuthCitizenController";
import { AuthModeratorController } from "./controllers/auth/moderator/refresh/AuthModeratorController";
import { EconomicboardCategoriesController } from "./controllers/economicBoard/categories/EconomicboardCategoriesController";
import { EconomicboardModeratorCategoriesController } from "./controllers/economicBoard/moderator/categories/EconomicboardModeratorCategoriesController";
import { EconomicboardCitizensController } from "./controllers/economicBoard/citizens/EconomicboardCitizensController";
import { EconomicboardCitizenCitizensController } from "./controllers/economicBoard/citizen/citizens/EconomicboardCitizenCitizensController";
import { Economic_boardCitizensController } from "./controllers/economic-board/citizens/Economic_boardCitizensController";
import { EconomicboardModeratorCitizensController } from "./controllers/economicBoard/moderator/citizens/EconomicboardModeratorCitizensController";
import { EconomicboardModeratorModeratorsController } from "./controllers/economicBoard/moderator/moderators/EconomicboardModeratorModeratorsController";
import { EconomicboardCitizenPostsController } from "./controllers/economicBoard/citizen/posts/EconomicboardCitizenPostsController";
import { EconomicboardModeratorPostsController } from "./controllers/economicBoard/moderator/posts/EconomicboardModeratorPostsController";
import { EconomicboardPostsController } from "./controllers/economicBoard/posts/EconomicboardPostsController";
import { EconomicboardCitizenPostsCommentsController } from "./controllers/economicBoard/citizen/posts/comments/EconomicboardCitizenPostsCommentsController";
import { EconomicboardPostsCommentsController } from "./controllers/economicBoard/posts/comments/EconomicboardPostsCommentsController";
import { EconomicboardModeratorPostsCommentsController } from "./controllers/economicBoard/moderator/posts/comments/EconomicboardModeratorPostsCommentsController";
import { EconomicboardCitizenAttachmentfilesController } from "./controllers/economicBoard/citizen/attachmentFiles/EconomicboardCitizenAttachmentfilesController";
import { EconomicboardAttachmentfilesController } from "./controllers/economicBoard/attachmentFiles/EconomicboardAttachmentfilesController";
import { EconomicboardModeratorAttachmentfilesController } from "./controllers/economicBoard/moderator/attachmentFiles/EconomicboardModeratorAttachmentfilesController";
import { EconomicboardModeratorModerationActionsController } from "./controllers/economicBoard/moderator/moderation/actions/EconomicboardModeratorModerationActionsController";
import { EconomicboardController } from "./controllers/economicBoard/search/EconomicboardController";
import { Economicboard_searchCategoriesController } from "./controllers/economicBoard/search/categories/Economicboard_searchCategoriesController";

@Module({
  controllers: [
    AuthCitizenController,
    AuthModeratorController,
    EconomicboardCategoriesController,
    EconomicboardModeratorCategoriesController,
    EconomicboardCitizensController,
    EconomicboardCitizenCitizensController,
    Economic_boardCitizensController,
    EconomicboardModeratorCitizensController,
    EconomicboardModeratorModeratorsController,
    EconomicboardCitizenPostsController,
    EconomicboardModeratorPostsController,
    EconomicboardPostsController,
    EconomicboardCitizenPostsCommentsController,
    EconomicboardPostsCommentsController,
    EconomicboardModeratorPostsCommentsController,
    EconomicboardCitizenAttachmentfilesController,
    EconomicboardAttachmentfilesController,
    EconomicboardModeratorAttachmentfilesController,
    EconomicboardModeratorModerationActionsController,
    EconomicboardController,
    Economicboard_searchCategoriesController,
  ],
})
export class MyModule {}
