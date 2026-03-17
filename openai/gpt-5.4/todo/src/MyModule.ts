import { Module } from "@nestjs/common";

import { TodoappAuthMemberController } from "./controllers/todoApp/auth/member/TodoappAuthMemberController";
import { TodoappMemberEmailverificationsController } from "./controllers/todoApp/member/emailVerifications/TodoappMemberEmailverificationsController";
import { TodoappMemberPasswordresetsController } from "./controllers/todoApp/member/passwordResets/TodoappMemberPasswordresetsController";
import { TodoappMemberProfileController } from "./controllers/todoApp/member/profile/TodoappMemberProfileController";
import { TodoappMemberSessionsController } from "./controllers/todoApp/member/sessions/TodoappMemberSessionsController";
import { TodoappMemberTodosController } from "./controllers/todoApp/member/todos/TodoappMemberTodosController";
import { TodoappMemberTodosEdithistoriesController } from "./controllers/todoApp/member/todos/editHistories/TodoappMemberTodosEdithistoriesController";
import { TodoappMemberTodosTrashController } from "./controllers/todoApp/member/todos/trash/TodoappMemberTodosTrashController";
import { TodoappMembersController } from "./controllers/todoApp/members/TodoappMembersController";

@Module({
  controllers: [
    TodoappAuthMemberController,
    TodoappMembersController,
    TodoappMemberProfileController,
    TodoappMemberSessionsController,
    TodoappMemberPasswordresetsController,
    TodoappMemberEmailverificationsController,
    TodoappMemberTodosController,
    TodoappMemberTodosTrashController,
    TodoappMemberTodosEdithistoriesController,
  ],
})
export class MyModule {}
