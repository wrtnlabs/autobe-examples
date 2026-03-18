import { Module } from "@nestjs/common";

import { TodoappAuthGuestController } from "./controllers/todoApp/auth/guest/TodoappAuthGuestController";
import { TodoappAuthMemberController } from "./controllers/todoApp/auth/member/TodoappAuthMemberController";
import { TodoappGuestGuestsController } from "./controllers/todoApp/guest/guests/TodoappGuestGuestsController";
import { TodoappGuestSessionsController } from "./controllers/todoApp/guest/sessions/TodoappGuestSessionsController";
import { TodoappMemberEmail_verificationsController } from "./controllers/todoApp/member/email-verifications/TodoappMemberEmail_verificationsController";
import { TodoappMemberMembersController } from "./controllers/todoApp/member/members/TodoappMemberMembersController";
import { TodoappMemberPassword_resetsController } from "./controllers/todoApp/member/password-resets/TodoappMemberPassword_resetsController";
import { TodoappMemberProfileController } from "./controllers/todoApp/member/profile/TodoappMemberProfileController";
import { TodoappMemberTodosController } from "./controllers/todoApp/member/todos/TodoappMemberTodosController";
import { TodoappMemberTodosCompletion_statusController } from "./controllers/todoApp/member/todos/completion-status/TodoappMemberTodosCompletion_statusController";
import { TodoappMemberTodosHistoriesController } from "./controllers/todoApp/member/todos/histories/TodoappMemberTodosHistoriesController";
import { TodoappMemberTodosTrashController } from "./controllers/todoApp/member/todos/trash/TodoappMemberTodosTrashController";
import { TodoappMemberTodosTrashRestoreController } from "./controllers/todoApp/member/todos/trash/restore/TodoappMemberTodosTrashRestoreController";

@Module({
  controllers: [
    TodoappAuthGuestController,
    TodoappAuthMemberController,
    TodoappGuestGuestsController,
    TodoappGuestSessionsController,
    TodoappMemberMembersController,
    TodoappMemberProfileController,
    TodoappMemberPassword_resetsController,
    TodoappMemberEmail_verificationsController,
    TodoappMemberTodosController,
    TodoappMemberTodosTrashController,
    TodoappMemberTodosHistoriesController,
    TodoappMemberTodosCompletion_statusController,
    TodoappMemberTodosTrashRestoreController,
  ],
})
export class MyModule {}
