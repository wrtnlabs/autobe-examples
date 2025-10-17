import { Module } from "@nestjs/common";

import { AuthGuestuserController } from "./controllers/auth/guestUser/AuthGuestuserController";
import { AuthAuthenticateduserController } from "./controllers/auth/authenticatedUser/AuthAuthenticateduserController";
import { AuthAdministratorController } from "./controllers/auth/administrator/AuthAdministratorController";
import { TodoappAuthController } from "./controllers/todoApp/auth/TodoappAuthController";
import { TodoappAuthenticateduserAuthProfileController } from "./controllers/todoApp/authenticatedUser/auth/profile/TodoappAuthenticateduserAuthProfileController";
import { TodoappAuthVerify_emailController } from "./controllers/todoApp/auth/verify-email/TodoappAuthVerify_emailController";
import { TodoappAuthRequest_password_resetController } from "./controllers/todoApp/auth/request-password-reset/TodoappAuthRequest_password_resetController";
import { TodoappAuthReset_passwordController } from "./controllers/todoApp/auth/reset-password/TodoappAuthReset_passwordController";
import { TodoappAuthenticateduserAuthChange_passwordController } from "./controllers/todoApp/authenticatedUser/auth/change-password/TodoappAuthenticateduserAuthChange_passwordController";
import { TodoappAuthenticateduserAuthDelete_accountController } from "./controllers/todoApp/authenticatedUser/auth/delete-account/TodoappAuthenticateduserAuthDelete_accountController";
import { TodoappAuthenticateduserTodosController } from "./controllers/todoApp/authenticatedUser/todos/TodoappAuthenticateduserTodosController";
import { TodoappTodosController } from "./controllers/todoApp/todos/TodoappTodosController";

@Module({
  controllers: [
    AuthGuestuserController,
    AuthAuthenticateduserController,
    AuthAdministratorController,
    TodoappAuthController,
    TodoappAuthenticateduserAuthProfileController,
    TodoappAuthVerify_emailController,
    TodoappAuthRequest_password_resetController,
    TodoappAuthReset_passwordController,
    TodoappAuthenticateduserAuthChange_passwordController,
    TodoappAuthenticateduserAuthDelete_accountController,
    TodoappAuthenticateduserTodosController,
    TodoappTodosController,
  ],
})
export class MyModule {}
