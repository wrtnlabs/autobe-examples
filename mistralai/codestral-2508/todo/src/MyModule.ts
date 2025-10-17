import { Module } from "@nestjs/common";

import { AuthUserController } from "./controllers/auth/user/AuthUserController";
import { TodolistUsersController } from "./controllers/todoList/users/TodolistUsersController";
import { TodolistUserUsersController } from "./controllers/todoList/user/users/logout/TodolistUserUsersController";
import { TodolistUserTasksController } from "./controllers/todoList/user/tasks/TodolistUserTasksController";
import { TodolistUserTasksPrioritiesController } from "./controllers/todoList/user/tasks/priorities/TodolistUserTasksPrioritiesController";
import { TodolistUserTasksDeadlinesController } from "./controllers/todoList/user/tasks/deadlines/TodolistUserTasksDeadlinesController";

@Module({
  controllers: [
    AuthUserController,
    TodolistUsersController,
    TodolistUserUsersController,
    TodolistUserTasksController,
    TodolistUserTasksPrioritiesController,
    TodolistUserTasksDeadlinesController,
  ],
})
export class MyModule {}
