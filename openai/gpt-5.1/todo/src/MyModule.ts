import { Module } from "@nestjs/common";

import { AuthGuestuserController } from "./controllers/auth/guestUser/AuthGuestuserController";
import { AuthMemberuserController } from "./controllers/auth/memberUser/AuthMemberuserController";
import { AuthAdminuserController } from "./controllers/auth/adminUser/AuthAdminuserController";
import { TodoappAdminuserSystemsettingsController } from "./controllers/todoApp/adminUser/systemSettings/TodoappAdminuserSystemsettingsController";
import { TodoappAdminuserGuestusersController } from "./controllers/todoApp/adminUser/guestUsers/TodoappAdminuserGuestusersController";
import { TodoappAdminuserMemberusersController } from "./controllers/todoApp/adminUser/memberUsers/TodoappAdminuserMemberusersController";
import { TodoappAdminuserMemberusersStatusController } from "./controllers/todoApp/adminUser/memberUsers/status/TodoappAdminuserMemberusersStatusController";
import { TodoappAdminuserMemberusersSessionsController } from "./controllers/todoApp/adminUser/memberUsers/sessions/TodoappAdminuserMemberusersSessionsController";
import { TodoappAdminuserAdminusersController } from "./controllers/todoApp/adminUser/adminUsers/TodoappAdminuserAdminusersController";
import { TodoappAdminuserAdminusersStatusController } from "./controllers/todoApp/adminUser/adminUsers/status/TodoappAdminuserAdminusersStatusController";
import { TodoappAdminuserAdminusersSessionsController } from "./controllers/todoApp/adminUser/adminUsers/sessions/TodoappAdminuserAdminusersSessionsController";
import { TodoappMemberuserActorsCurrentController } from "./controllers/todoApp/memberUser/actors/current/TodoappMemberuserActorsCurrentController";
import { TodoappMemberuserActorsCurrentSessionsController } from "./controllers/todoApp/memberUser/actors/current/sessions/TodoappMemberuserActorsCurrentSessionsController";
import { TodoappMemberuserTodosController } from "./controllers/todoApp/memberUser/todos/TodoappMemberuserTodosController";

@Module({
  controllers: [
    AuthGuestuserController,
    AuthMemberuserController,
    AuthAdminuserController,
    TodoappAdminuserSystemsettingsController,
    TodoappAdminuserGuestusersController,
    TodoappAdminuserMemberusersController,
    TodoappAdminuserMemberusersStatusController,
    TodoappAdminuserMemberusersSessionsController,
    TodoappAdminuserAdminusersController,
    TodoappAdminuserAdminusersStatusController,
    TodoappAdminuserAdminusersSessionsController,
    TodoappMemberuserActorsCurrentController,
    TodoappMemberuserActorsCurrentSessionsController,
    TodoappMemberuserTodosController,
  ],
})
export class MyModule {}
