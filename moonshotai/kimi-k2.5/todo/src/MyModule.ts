import { Module } from "@nestjs/common";

import { TodoappAuthGuestController } from "./controllers/todoApp/auth/guest/TodoappAuthGuestController";
import { TodoappAuthMemberController } from "./controllers/todoApp/auth/member/TodoappAuthMemberController";
import { TodoappMemberAuthMembersController } from "./controllers/todoApp/member/auth/members/logout/TodoappMemberAuthMembersController";
import { TodoappMemberAuthMembersMeController } from "./controllers/todoApp/member/auth/members/me/TodoappMemberAuthMembersMeController";
import { TodoappMemberMembersController } from "./controllers/todoApp/member/members/TodoappMemberMembersController";
import { TodoappMemberAuthMembersPasswordResetController } from "./controllers/todoApp/member/auth/members/password/reset/verify/TodoappMemberAuthMembersPasswordResetController";
import { TodoappMemberTodosController } from "./controllers/todoApp/member/todos/TodoappMemberTodosController";
import { TodoappHealthController } from "./controllers/todoApp/health/TodoappHealthController";

@Module({
  controllers: [
    TodoappAuthGuestController,
    TodoappAuthMemberController,
    TodoappMemberAuthMembersController,
    TodoappMemberAuthMembersMeController,
    TodoappMemberMembersController,
    TodoappMemberAuthMembersPasswordResetController,
    TodoappMemberTodosController,
    TodoappHealthController,
  ],
})
export class MyModule {}
