import { Module } from "@nestjs/common";

import { AuthGuestController } from "./controllers/auth/guest/AuthGuestController";
import { AuthMemberController } from "./controllers/auth/member/AuthMemberController";
import { TodoMemberTodosController } from "./controllers/todo/member/todos/TodoMemberTodosController";
import { TodoMemberMembersController } from "./controllers/todo/member/members/TodoMemberMembersController";

@Module({
  controllers: [
    AuthGuestController,
    AuthMemberController,
    TodoMemberTodosController,
    TodoMemberMembersController,
  ],
})
export class MyModule {}
