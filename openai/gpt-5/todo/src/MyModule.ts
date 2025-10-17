import { Module } from "@nestjs/common";

import { AuthGuestvisitorController } from "./controllers/auth/guestVisitor/AuthGuestvisitorController";
import { AuthTodomemberController } from "./controllers/auth/todoMember/AuthTodomemberController";
import { AuthTodomemberPasswordController } from "./controllers/auth/todoMember/password/AuthTodomemberPasswordController";
import { AuthSystemadminController } from "./controllers/auth/systemAdmin/AuthSystemadminController";
import { TodolistTodomemberTodosController } from "./controllers/todoList/todoMember/todos/TodolistTodomemberTodosController";
import { TodolistTodosController } from "./controllers/todoList/todos/TodolistTodosController";
import { TodolistSystemadminTodomembersController } from "./controllers/todoList/systemAdmin/todoMembers/TodolistSystemadminTodomembersController";
import { TodolistSystemadminSystemadminsController } from "./controllers/todoList/systemAdmin/systemAdmins/TodolistSystemadminSystemadminsController";
import { TodolistSystemadminGuestvisitorsController } from "./controllers/todoList/systemAdmin/guestVisitors/TodolistSystemadminGuestvisitorsController";

@Module({
  controllers: [
    AuthGuestvisitorController,
    AuthTodomemberController,
    AuthTodomemberPasswordController,
    AuthSystemadminController,
    TodolistTodomemberTodosController,
    TodolistTodosController,
    TodolistSystemadminTodomembersController,
    TodolistSystemadminSystemadminsController,
    TodolistSystemadminGuestvisitorsController,
  ],
})
export class MyModule {}
