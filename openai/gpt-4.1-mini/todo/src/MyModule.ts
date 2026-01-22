import { Module } from "@nestjs/common";

import { AuthGuestController } from "./controllers/auth/guest/AuthGuestController";
import { AuthGuest_publicController } from "./controllers/auth/guest/public/AuthGuest_publicController";
import { AuthUserController } from "./controllers/auth/user/AuthUserController";
import { AuthUserAuthorization_activityController } from "./controllers/auth/user/authorization-activity/AuthUserAuthorization_activityController";
import { TodoappGuestsController } from "./controllers/todoApp/guests/TodoappGuestsController";
import { TodoappGuestGuestsController } from "./controllers/todoApp/guest/guests/TodoappGuestGuestsController";
import { TodoappGuestGuestsSessionsController } from "./controllers/todoApp/guest/guests/sessions/TodoappGuestGuestsSessionsController";
import { TodoappGuestsSessionsController } from "./controllers/todoApp/guests/sessions/TodoappGuestsSessionsController";
import { TodoappUserAccess_tokensController } from "./controllers/todoApp/user/access-tokens/TodoappUserAccess_tokensController";
import { TodoappAccess_tokensController } from "./controllers/todoApp/access-tokens/TodoappAccess_tokensController";
import { TodoappUserRefresh_tokensController } from "./controllers/todoApp/user/refresh-tokens/TodoappUserRefresh_tokensController";
import { TodoappRefresh_tokensController } from "./controllers/todoApp/refresh-tokens/TodoappRefresh_tokensController";
import { TodoappGuestRefresh_tokensController } from "./controllers/todoApp/guest/refresh-tokens/TodoappGuestRefresh_tokensController";
import { TodoappUserConfigurationsController } from "./controllers/todoApp/user/configurations/TodoappUserConfigurationsController";
import { TodoappConfigurationsController } from "./controllers/todoApp/configurations/TodoappConfigurationsController";
import { TodoappUserSecurity_policiesController } from "./controllers/todoApp/user/security-policies/TodoappUserSecurity_policiesController";
import { TodoappUserRolesController } from "./controllers/todoApp/user/roles/TodoappUserRolesController";
import { TodoappRolesController } from "./controllers/todoApp/roles/TodoappRolesController";
import { TodoappUserUser_email_verificationsController } from "./controllers/todoApp/user/user-email-verifications/TodoappUserUser_email_verificationsController";
import { TodoappUserUser_password_resetsController } from "./controllers/todoApp/user/user-password-resets/TodoappUserUser_password_resetsController";
import { TodoappUser_password_resetsController } from "./controllers/todoApp/user-password-resets/TodoappUser_password_resetsController";
import { TodoappUserUsersRolesController } from "./controllers/todoApp/user/users/roles/TodoappUserUsersRolesController";
import { TodoappUserTodo_itemsController } from "./controllers/todoApp/user/todo-items/TodoappUserTodo_itemsController";
import { TodoappUserUsersController } from "./controllers/todoApp/user/users/TodoappUserUsersController";
import { TodoappUserUser_sessionsController } from "./controllers/todoApp/user/user-sessions/TodoappUserUser_sessionsController";
import { TodoappUserTodo_item_audit_logsController } from "./controllers/todoApp/user/todo-item-audit-logs/TodoappUserTodo_item_audit_logsController";

@Module({
  controllers: [
    AuthGuestController,
    AuthGuest_publicController,
    AuthUserController,
    AuthUserAuthorization_activityController,
    TodoappGuestsController,
    TodoappGuestGuestsController,
    TodoappGuestGuestsSessionsController,
    TodoappGuestsSessionsController,
    TodoappUserAccess_tokensController,
    TodoappAccess_tokensController,
    TodoappUserRefresh_tokensController,
    TodoappRefresh_tokensController,
    TodoappGuestRefresh_tokensController,
    TodoappUserConfigurationsController,
    TodoappConfigurationsController,
    TodoappUserSecurity_policiesController,
    TodoappUserRolesController,
    TodoappRolesController,
    TodoappUserUser_email_verificationsController,
    TodoappUserUser_password_resetsController,
    TodoappUser_password_resetsController,
    TodoappUserUsersRolesController,
    TodoappUserTodo_itemsController,
    TodoappUserUsersController,
    TodoappUserUser_sessionsController,
    TodoappUserTodo_item_audit_logsController,
  ],
})
export class MyModule {}
