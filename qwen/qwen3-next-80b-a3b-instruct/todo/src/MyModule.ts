import { Module } from "@nestjs/common";

import { AuthUserController } from "./controllers/auth/user/AuthUserController";
import { AuthUserPasswordResetController } from "./controllers/auth/user/password/reset/AuthUserPasswordResetController";
import { AuthGuestController } from "./controllers/auth/guest/AuthGuestController";
import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { TodolistUsersController } from "./controllers/todoList/users/TodolistUsersController";
import { TodolistUserUsersController } from "./controllers/todoList/user/users/TodolistUserUsersController";
import { TodolistGuestsController } from "./controllers/todoList/guests/TodolistGuestsController";
import { TodolistAdminAdminsController } from "./controllers/todoList/admin/admins/TodolistAdminAdminsController";
import { TodolistAdminsController } from "./controllers/todoList/admins/TodolistAdminsController";
import { TodolistTodosController } from "./controllers/todoList/todos/TodolistTodosController";
import { TodolistUserTodosController } from "./controllers/todoList/user/todos/TodolistUserTodosController";

@Module({
  controllers: [
    AuthUserController,
    AuthUserPasswordResetController,
    AuthGuestController,
    AuthAdminController,
    TodolistUsersController,
    TodolistUserUsersController,
    TodolistGuestsController,
    TodolistAdminAdminsController,
    TodolistAdminsController,
    TodolistTodosController,
    TodolistUserTodosController,
  ],
})
export class MyModule {}
