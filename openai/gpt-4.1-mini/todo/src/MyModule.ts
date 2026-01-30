import { Module } from "@nestjs/common";

import { TodoappAuthGuestController } from "./controllers/todoApp/auth/guest/TodoappAuthGuestController";
import { TodoappAuthUserController } from "./controllers/todoApp/auth/user/TodoappAuthUserController";
import { TodoappUserRolesController } from "./controllers/todoApp/user/roles/TodoappUserRolesController";
import { TodoappUserUsersEmailVerificationsController } from "./controllers/todoApp/user/users/email/verifications/TodoappUserUsersEmailVerificationsController";
import { TodoappUserUsersPasswordResetsController } from "./controllers/todoApp/user/users/password/resets/TodoappUserUsersPasswordResetsController";
import { TodoappUserUsersRolesController } from "./controllers/todoApp/user/users/roles/TodoappUserUsersRolesController";
import { TodoappUserUsersController } from "./controllers/todoApp/user/users/TodoappUserUsersController";
import { TodoappUserUsersTodoitemsController } from "./controllers/todoApp/user/users/todoItems/TodoappUserUsersTodoitemsController";
import { TodoappUserUsersTodoitemsAuditlogsController } from "./controllers/todoApp/user/users/todoItems/auditLogs/TodoappUserUsersTodoitemsAuditlogsController";
import { TodoappUserUsersSessionsController } from "./controllers/todoApp/user/users/sessions/TodoappUserUsersSessionsController";
import { TodoappUserAuthUsersLogoutController } from "./controllers/todoApp/user/auth/users/logout/TodoappUserAuthUsersLogoutController";

@Module({
  controllers: [
    TodoappAuthGuestController,
    TodoappAuthUserController,
    TodoappUserRolesController,
    TodoappUserUsersEmailVerificationsController,
    TodoappUserUsersPasswordResetsController,
    TodoappUserUsersRolesController,
    TodoappUserUsersController,
    TodoappUserUsersTodoitemsController,
    TodoappUserUsersTodoitemsAuditlogsController,
    TodoappUserUsersSessionsController,
    TodoappUserAuthUsersLogoutController,
  ],
})
export class MyModule {}
