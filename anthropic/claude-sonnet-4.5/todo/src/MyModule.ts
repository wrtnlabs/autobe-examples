import { Module } from "@nestjs/common";

import { AuthUserController } from "./controllers/auth/user/AuthUserController";
import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { TodolistUserUsersMeController } from "./controllers/todoList/user/users/me/TodolistUserUsersMeController";
import { TodolistUserUsersMePasswordController } from "./controllers/todoList/user/users/me/password/TodolistUserUsersMePasswordController";
import { TodolistUserUsersMeSessionsController } from "./controllers/todoList/user/users/me/sessions/TodolistUserUsersMeSessionsController";
import { TodolistAdminAdminsMeController } from "./controllers/todoList/admin/admins/me/TodolistAdminAdminsMeController";
import { TodolistAdminAdminsMePasswordController } from "./controllers/todoList/admin/admins/me/password/TodolistAdminAdminsMePasswordController";
import { TodolistAdminAdminsMeSessionsController } from "./controllers/todoList/admin/admins/me/sessions/TodolistAdminAdminsMeSessionsController";
import { TodolistUserTodosController } from "./controllers/todoList/user/todos/TodolistUserTodosController";

@Module({
  controllers: [
    AuthUserController,
    AuthAdminController,
    TodolistUserUsersMeController,
    TodolistUserUsersMePasswordController,
    TodolistUserUsersMeSessionsController,
    TodolistAdminAdminsMeController,
    TodolistAdminAdminsMePasswordController,
    TodolistAdminAdminsMeSessionsController,
    TodolistUserTodosController,
  ],
})
export class MyModule {}
