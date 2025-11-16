import { Module } from "@nestjs/common";

import { AuthGuestuserController } from "./controllers/auth/guestUser/AuthGuestuserController";
import { AuthTodouserController } from "./controllers/auth/todoUser/AuthTodouserController";
import { AuthTodoadminController } from "./controllers/auth/todoAdmin/AuthTodoadminController";
import { TodoappTodostatusesController } from "./controllers/todoApp/todoStatuses/TodoappTodostatusesController";
import { TodoappTodoadminTodostatusesController } from "./controllers/todoApp/todoAdmin/todoStatuses/TodoappTodoadminTodostatusesController";
import { TodoappTodoadminSystemconfigsController } from "./controllers/todoApp/todoAdmin/systemConfigs/TodoappTodoadminSystemconfigsController";
import { TodoappTodoadminSystemconfigsRuntimeController } from "./controllers/todoApp/todoAdmin/systemConfigs/runtime/TodoappTodoadminSystemconfigsRuntimeController";
import { TodoappTodoadminGuestusersController } from "./controllers/todoApp/todoAdmin/guestUsers/TodoappTodoadminGuestusersController";
import { TodoappGuestuserGuestusersController } from "./controllers/todoApp/guestUser/guestUsers/TodoappGuestuserGuestusersController";
import { TodoappTodoadminGuestusersSessionsController } from "./controllers/todoApp/todoAdmin/guestUsers/sessions/TodoappTodoadminGuestusersSessionsController";
import { TodoappGuestuserGuestusersSessionsController } from "./controllers/todoApp/guestUser/guestUsers/sessions/TodoappGuestuserGuestusersSessionsController";
import { TodoappTodoadminTodousersController } from "./controllers/todoApp/todoAdmin/todoUsers/TodoappTodoadminTodousersController";
import { TodoappTodoadminTodousersSessionsController } from "./controllers/todoApp/todoAdmin/todoUsers/sessions/TodoappTodoadminTodousersSessionsController";
import { TodoappTodoadminTodoadminsController } from "./controllers/todoApp/todoAdmin/todoAdmins/TodoappTodoadminTodoadminsController";
import { TodoappTodoadminTodoadminsSessionsController } from "./controllers/todoApp/todoAdmin/todoAdmins/sessions/TodoappTodoadminTodoadminsSessionsController";
import { TodoappTodoadminActorsSessionsController } from "./controllers/todoApp/todoAdmin/actors/sessions/TodoappTodoadminActorsSessionsController";
import { TodoappTodouserTodosController } from "./controllers/todoApp/todoUser/todos/TodoappTodouserTodosController";
import { TodoappTodoadminTodosAdminauditsController } from "./controllers/todoApp/todoAdmin/todos/adminAudits/TodoappTodoadminTodosAdminauditsController";

@Module({
  controllers: [
    AuthGuestuserController,
    AuthTodouserController,
    AuthTodoadminController,
    TodoappTodostatusesController,
    TodoappTodoadminTodostatusesController,
    TodoappTodoadminSystemconfigsController,
    TodoappTodoadminSystemconfigsRuntimeController,
    TodoappTodoadminGuestusersController,
    TodoappGuestuserGuestusersController,
    TodoappTodoadminGuestusersSessionsController,
    TodoappGuestuserGuestusersSessionsController,
    TodoappTodoadminTodousersController,
    TodoappTodoadminTodousersSessionsController,
    TodoappTodoadminTodoadminsController,
    TodoappTodoadminTodoadminsSessionsController,
    TodoappTodoadminActorsSessionsController,
    TodoappTodouserTodosController,
    TodoappTodoadminTodosAdminauditsController,
  ],
})
export class MyModule {}
