import { Module } from "@nestjs/common";

import { AuthGuestJoinController } from "./controllers/auth/guest/join/AuthGuestJoinController";
import { AuthGuestRefreshController } from "./controllers/auth/guest/refresh/AuthGuestRefreshController";
import { AuthUserController } from "./controllers/auth/user/AuthUserController";
import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { TodolistUserTodolisttasksController } from "./controllers/todoList/user/todoListTasks/TodolistUserTodolisttasksController";

@Module({
  controllers: [
    AuthGuestJoinController,
    AuthGuestRefreshController,
    AuthUserController,
    AuthAdminController,
    TodolistUserTodolisttasksController,
  ],
})
export class MyModule {}
