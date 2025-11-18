import { Module } from "@nestjs/common";

import { AuthGuestController } from "./controllers/auth/guest/AuthGuestController";
import { AuthUserController } from "./controllers/auth/user/AuthUserController";
import { AuthUserPasswordChangeController } from "./controllers/auth/user/password/change/AuthUserPasswordChangeController";
import { AuthUserEmailVerifyController } from "./controllers/auth/user/email/verify/AuthUserEmailVerifyController";
import { AuthUserTwo_factorEnableController } from "./controllers/auth/user/two-factor/enable/AuthUserTwo_factorEnableController";
import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { TodolistAdminTodolistsystemconfigurationsController } from "./controllers/todoList/admin/todoListSystemConfigurations/TodolistAdminTodolistsystemconfigurationsController";
import { TodolistAdminTodolistguestsController } from "./controllers/todoList/admin/todoListGuests/TodolistAdminTodolistguestsController";
import { TodolistTodolistguestsController } from "./controllers/todoList/todoListGuests/TodolistTodolistguestsController";
import { TodolistUserTodolistguestsController } from "./controllers/todoList/user/todoListGuests/TodolistUserTodolistguestsController";
import { TodolistUserTodolistguestsTodolistguestsessionsController } from "./controllers/todoList/user/todoListGuests/todoListGuestSessions/TodolistUserTodolistguestsTodolistguestsessionsController";
import { TodolistUserTodolistusersController } from "./controllers/todoList/user/todoListUsers/TodolistUserTodolistusersController";
import { TodolistAdminTodolistusersController } from "./controllers/todoList/admin/todoListUsers/TodolistAdminTodolistusersController";
import { TodolistUserTodolistusersTodolistusersessionsController } from "./controllers/todoList/user/todoListUsers/todoListUserSessions/TodolistUserTodolistusersTodolistusersessionsController";
import { TodolistAdminTodolistadminsController } from "./controllers/todoList/admin/todoListAdmins/TodolistAdminTodolistadminsController";
import { TodolistAdminTodolistadminsTodolistadminsessionsController } from "./controllers/todoList/admin/todoListAdmins/todoListAdminSessions/TodolistAdminTodolistadminsTodolistadminsessionsController";
import { TodolistUserTodolisttodosController } from "./controllers/todoList/user/todoListTodos/TodolistUserTodolisttodosController";

@Module({
  controllers: [
    AuthGuestController,
    AuthUserController,
    AuthUserPasswordChangeController,
    AuthUserEmailVerifyController,
    AuthUserTwo_factorEnableController,
    AuthAdminController,
    TodolistAdminTodolistsystemconfigurationsController,
    TodolistAdminTodolistguestsController,
    TodolistTodolistguestsController,
    TodolistUserTodolistguestsController,
    TodolistUserTodolistguestsTodolistguestsessionsController,
    TodolistUserTodolistusersController,
    TodolistAdminTodolistusersController,
    TodolistUserTodolistusersTodolistusersessionsController,
    TodolistAdminTodolistadminsController,
    TodolistAdminTodolistadminsTodolistadminsessionsController,
    TodolistUserTodolisttodosController,
  ],
})
export class MyModule {}
