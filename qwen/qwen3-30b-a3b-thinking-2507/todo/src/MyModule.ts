import { Module } from "@nestjs/common";

import { AuthUserController } from "./controllers/auth/user/AuthUserController";
import { TodoUserUsersController } from "./controllers/todo/user/users/TodoUserUsersController";
import { TodoUserUsersSessionsController } from "./controllers/todo/user/users/sessions/TodoUserUsersSessionsController";
import { TodoUserTasksController } from "./controllers/todo/user/tasks/TodoUserTasksController";

@Module({
  controllers: [
    AuthUserController,
    TodoUserUsersController,
    TodoUserUsersSessionsController,
    TodoUserTasksController,
  ],
})
export class MyModule {}
