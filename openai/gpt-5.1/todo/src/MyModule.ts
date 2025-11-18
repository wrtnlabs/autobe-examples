import { Module } from "@nestjs/common";

import { AuthGuestuserController } from "./controllers/auth/guestUser/AuthGuestuserController";
import { AuthMemberuserController } from "./controllers/auth/memberUser/AuthMemberuserController";
import { AuthMemberuserPasswordController } from "./controllers/auth/memberUser/password/AuthMemberuserPasswordController";
import { AuthAdminuserController } from "./controllers/auth/adminUser/AuthAdminuserController";
import { TodoappGuestuserGuestusersController } from "./controllers/todoApp/guestUser/guestUsers/TodoappGuestuserGuestusersController";
import { TodoappAdminuserMemberusersController } from "./controllers/todoApp/adminUser/memberUsers/TodoappAdminuserMemberusersController";
import { TodoappMemberuserMemberusersSessionsController } from "./controllers/todoApp/memberUser/memberUsers/sessions/TodoappMemberuserMemberusersSessionsController";
import { TodoappAdminuserMemberusersSessionsController } from "./controllers/todoApp/adminUser/memberUsers/sessions/TodoappAdminuserMemberusersSessionsController";
import { TodoappAdminuserAdminusersController } from "./controllers/todoApp/adminUser/adminUsers/TodoappAdminuserAdminusersController";
import { TodoappAdminuserAdminusersSessionsController } from "./controllers/todoApp/adminUser/adminUsers/sessions/TodoappAdminuserAdminusersSessionsController";
import { TodoappAdminuserActorsSearchController } from "./controllers/todoApp/adminUser/actors/search/TodoappAdminuserActorsSearchController";
import { TodoappMemberuserTodosController } from "./controllers/todoApp/memberUser/todos/TodoappMemberuserTodosController";
import { TodoappMemberuserTodosStatussummaryController } from "./controllers/todoApp/memberUser/todos/statusSummary/TodoappMemberuserTodosStatussummaryController";
import { TodoappAdminuserLoginattemptsController } from "./controllers/todoApp/adminUser/loginAttempts/TodoappAdminuserLoginattemptsController";
import { TodoappAdminuserAdmintodoactionsController } from "./controllers/todoApp/adminUser/adminTodoActions/TodoappAdminuserAdmintodoactionsController";
import { TodoappAdminuserRatelimiteventsController } from "./controllers/todoApp/adminUser/rateLimitEvents/TodoappAdminuserRatelimiteventsController";

@Module({
  controllers: [
    AuthGuestuserController,
    AuthMemberuserController,
    AuthMemberuserPasswordController,
    AuthAdminuserController,
    TodoappGuestuserGuestusersController,
    TodoappAdminuserMemberusersController,
    TodoappMemberuserMemberusersSessionsController,
    TodoappAdminuserMemberusersSessionsController,
    TodoappAdminuserAdminusersController,
    TodoappAdminuserAdminusersSessionsController,
    TodoappAdminuserActorsSearchController,
    TodoappMemberuserTodosController,
    TodoappMemberuserTodosStatussummaryController,
    TodoappAdminuserLoginattemptsController,
    TodoappAdminuserAdmintodoactionsController,
    TodoappAdminuserRatelimiteventsController,
  ],
})
export class MyModule {}
