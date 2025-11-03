import { Module } from "@nestjs/common";

import { AuthUserController } from "./controllers/auth/user/AuthUserController";
import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { TodolistUsersController } from "./controllers/todoList/users/TodolistUsersController";
import { TodolistUserUsersController } from "./controllers/todoList/user/users/logout/TodolistUserUsersController";
import { TodolistUserUsers_logoutAllController } from "./controllers/todoList/user/users/logout/all/TodolistUserUsers_logoutAllController";
import { TodolistUsersPasswordResetController } from "./controllers/todoList/users/password/reset/TodolistUsersPasswordResetController";
import { TodolistUsersPasswordResetVerifyController } from "./controllers/todoList/users/password/reset/verify/TodolistUsersPasswordResetVerifyController";
import { TodolistUserUsersMeController } from "./controllers/todoList/user/users/me/TodolistUserUsersMeController";
import { TodolistUserUsersMePasswordController } from "./controllers/todoList/user/users/me/password/TodolistUserUsersMePasswordController";
import { TodolistUserUsersMeSessionsController } from "./controllers/todoList/user/users/me/sessions/TodolistUserUsersMeSessionsController";
import { TodolistAdminsController } from "./controllers/todoList/admins/login/TodolistAdminsController";
import { TodolistAdminAdminsController } from "./controllers/todoList/admin/admins/logout/TodolistAdminAdminsController";
import { TodolistAdminAdmins_logoutAllController } from "./controllers/todoList/admin/admins/logout/all/TodolistAdminAdmins_logoutAllController";
import { TodolistAdminAdminsMeController } from "./controllers/todoList/admin/admins/me/TodolistAdminAdminsMeController";
import { TodolistAdminAdminsMePasswordController } from "./controllers/todoList/admin/admins/me/password/TodolistAdminAdminsMePasswordController";
import { TodolistAdminAdminsMeSessionsController } from "./controllers/todoList/admin/admins/me/sessions/TodolistAdminAdminsMeSessionsController";
import { TodolistAdminAdminsUsersController } from "./controllers/todoList/admin/admins/users/TodolistAdminAdminsUsersController";
import { TodolistAdminAdminsStatisticsController } from "./controllers/todoList/admin/admins/statistics/TodolistAdminAdminsStatisticsController";
import { TodolistUserTodosController } from "./controllers/todoList/user/todos/TodolistUserTodosController";

@Module({
  controllers: [
    AuthUserController,
    AuthAdminController,
    TodolistUsersController,
    TodolistUserUsersController,
    TodolistUserUsers_logoutAllController,
    TodolistUsersPasswordResetController,
    TodolistUsersPasswordResetVerifyController,
    TodolistUserUsersMeController,
    TodolistUserUsersMePasswordController,
    TodolistUserUsersMeSessionsController,
    TodolistAdminsController,
    TodolistAdminAdminsController,
    TodolistAdminAdmins_logoutAllController,
    TodolistAdminAdminsMeController,
    TodolistAdminAdminsMePasswordController,
    TodolistAdminAdminsMeSessionsController,
    TodolistAdminAdminsUsersController,
    TodolistAdminAdminsStatisticsController,
    TodolistUserTodosController,
  ],
})
export class MyModule {}
