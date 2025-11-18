import { Module } from "@nestjs/common";

import { AuthUserController } from "./controllers/auth/user/AuthUserController";
import { TodolistUserUsersController } from "./controllers/todoList/user/users/TodolistUserUsersController";
import { TodolistUserUsersessionsController } from "./controllers/todoList/user/userSessions/TodolistUserUsersessionsController";
import { TodolistUserUsersSessionsController } from "./controllers/todoList/user/users/sessions/TodolistUserUsersSessionsController";
import { TodolistTasksController } from "./controllers/todoList/tasks/TodolistTasksController";
import { TodolistUserTasksController } from "./controllers/todoList/user/tasks/TodolistUserTasksController";

@Module({
  controllers: [
    AuthUserController,
    TodolistUserUsersController,
    TodolistUserUsersessionsController,
    TodolistUserUsersSessionsController,
    TodolistTasksController,
    TodolistUserTasksController,
  ],
})
export class MyModule {}
