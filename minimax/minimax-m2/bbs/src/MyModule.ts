import { Module } from "@nestjs/common";

import { AuthGuestuserController } from "./controllers/auth/guestUser/join/AuthGuestuserController";
import { AuthGuestuserRefreshController } from "./controllers/auth/guestUser/refresh/AuthGuestuserRefreshController";
import { AuthRegisteredmemberController } from "./controllers/auth/registeredMember/AuthRegisteredmemberController";
import { AuthContentmoderatorJoinController } from "./controllers/auth/contentModerator/join/AuthContentmoderatorJoinController";
import { AuthContentmoderatorLoginController } from "./controllers/auth/contentModerator/login/AuthContentmoderatorLoginController";
import { AuthContentmoderatorRefreshController } from "./controllers/auth/contentModerator/refresh/AuthContentmoderatorRefreshController";
import { AuthContentmoderatorPasswordResetController } from "./controllers/auth/contentModerator/password/reset/AuthContentmoderatorPasswordResetController";
import { AuthSystemadministratorJoinController } from "./controllers/auth/systemAdministrator/join/AuthSystemadministratorJoinController";
import { AuthSystemadministratorLoginController } from "./controllers/auth/systemAdministrator/login/AuthSystemadministratorLoginController";
import { AuthSystemadministratorRefreshController } from "./controllers/auth/systemAdministrator/refresh/AuthSystemadministratorRefreshController";
import { EconpoliticaldiscussionArticlesController } from "./controllers/econPoliticalDiscussion/articles/EconpoliticaldiscussionArticlesController";
import { EconpoliticaldiscussionRegisteredmemberArticlesController } from "./controllers/econPoliticalDiscussion/registeredMember/articles/EconpoliticaldiscussionRegisteredmemberArticlesController";
import { EconpoliticaldiscussionCategoriesController } from "./controllers/econPoliticalDiscussion/categories/EconpoliticaldiscussionCategoriesController";
import { EconpoliticaldiscussionSystemadministratorCategoriesController } from "./controllers/econPoliticalDiscussion/systemAdministrator/categories/EconpoliticaldiscussionSystemadministratorCategoriesController";
import { EconpoliticaldiscussionArticlesAttachmentsController } from "./controllers/econPoliticalDiscussion/articles/attachments/EconpoliticaldiscussionArticlesAttachmentsController";
import { EconpoliticaldiscussionAttachmentsController } from "./controllers/econPoliticalDiscussion/attachments/EconpoliticaldiscussionAttachmentsController";
import { EconpoliticaldiscussionUsersController } from "./controllers/econPoliticalDiscussion/users/EconpoliticaldiscussionUsersController";
import { EconpoliticaldiscussionSystemadministratorUsersController } from "./controllers/econPoliticalDiscussion/systemAdministrator/users/EconpoliticaldiscussionSystemadministratorUsersController";
import { EconpoliticaldiscussionRegisteredmemberUsersArticlesController } from "./controllers/econPoliticalDiscussion/registeredMember/users/articles/EconpoliticaldiscussionRegisteredmemberUsersArticlesController";
import { EconpoliticaldiscussionSystemadministratorUsersEmailController } from "./controllers/econPoliticalDiscussion/systemAdministrator/users/email/EconpoliticaldiscussionSystemadministratorUsersEmailController";
import { UsersArticlesController } from "./controllers/users/articles/UsersArticlesController";
import { UsersEmailController } from "./controllers/users/email/UsersEmailController";
import { EconpoliticaldiscussionRegisteredmemberArticlesAttachmentsController } from "./controllers/econPoliticalDiscussion/registeredMember/articles/attachments/EconpoliticaldiscussionRegisteredmemberArticlesAttachmentsController";

@Module({
  controllers: [
    AuthGuestuserController,
    AuthGuestuserRefreshController,
    AuthRegisteredmemberController,
    AuthContentmoderatorJoinController,
    AuthContentmoderatorLoginController,
    AuthContentmoderatorRefreshController,
    AuthContentmoderatorPasswordResetController,
    AuthSystemadministratorJoinController,
    AuthSystemadministratorLoginController,
    AuthSystemadministratorRefreshController,
    EconpoliticaldiscussionArticlesController,
    EconpoliticaldiscussionRegisteredmemberArticlesController,
    EconpoliticaldiscussionCategoriesController,
    EconpoliticaldiscussionSystemadministratorCategoriesController,
    EconpoliticaldiscussionArticlesAttachmentsController,
    EconpoliticaldiscussionAttachmentsController,
    EconpoliticaldiscussionUsersController,
    EconpoliticaldiscussionSystemadministratorUsersController,
    EconpoliticaldiscussionRegisteredmemberUsersArticlesController,
    EconpoliticaldiscussionSystemadministratorUsersEmailController,
    UsersArticlesController,
    UsersEmailController,
    EconpoliticaldiscussionRegisteredmemberArticlesAttachmentsController,
  ],
})
export class MyModule {}
