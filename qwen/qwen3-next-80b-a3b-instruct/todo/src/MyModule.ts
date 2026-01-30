import { Module } from "@nestjs/common";

import { TodoappAuthUserController } from "./controllers/todoApp/auth/user/TodoappAuthUserController";
import { TodoappAuthGuestController } from "./controllers/todoApp/auth/guest/TodoappAuthGuestController";
import { TodoappUserAuthUsersVerifyEmailController } from "./controllers/todoApp/user/auth/users/verify/email/TodoappUserAuthUsersVerifyEmailController";
import { TodoappUserAuthUsersController } from "./controllers/todoApp/user/auth/users/logout/TodoappUserAuthUsersController";
import { TodoappUserUsersController } from "./controllers/todoApp/user/users/TodoappUserUsersController";
import { TodoappUserTodosController } from "./controllers/todoApp/user/todos/TodoappUserTodosController";

@Module({
  controllers: [
    TodoappAuthUserController,
    TodoappAuthGuestController,
    TodoappUserAuthUsersVerifyEmailController,
    TodoappUserAuthUsersController,
    TodoappUserUsersController,
    TodoappUserTodosController,
  ],
})
export class MyModule {}
