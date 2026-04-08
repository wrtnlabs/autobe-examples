import { Module } from "@nestjs/common";

import { TodoappAuthGuestController } from "./controllers/todoApp/auth/guest/TodoappAuthGuestController";
import { TodoappAuthMemberController } from "./controllers/todoApp/auth/member/TodoappAuthMemberController";
import { TodoappGuestSessionsController } from "./controllers/todoApp/guest/sessions/TodoappGuestSessionsController";
import { TodoappGuestsController } from "./controllers/todoApp/guests/TodoappGuestsController";
import { TodoappMemberEmail_verificationsController } from "./controllers/todoApp/member/email-verifications/TodoappMemberEmail_verificationsController";
import { TodoappMemberPassword_resetsController } from "./controllers/todoApp/member/password-resets/TodoappMemberPassword_resetsController";
import { TodoappMemberProfileController } from "./controllers/todoApp/member/profile/TodoappMemberProfileController";
import { TodoappMemberTodosController } from "./controllers/todoApp/member/todos/TodoappMemberTodosController";
import { TodoappMemberTodosCompleteController } from "./controllers/todoApp/member/todos/complete/TodoappMemberTodosCompleteController";
import { TodoappMemberTodosSnapshotsController } from "./controllers/todoApp/member/todos/snapshots/TodoappMemberTodosSnapshotsController";
import { TodoappMemberTodosTrashController } from "./controllers/todoApp/member/todos/trash/TodoappMemberTodosTrashController";
import { TodoappMemberTrashController } from "./controllers/todoApp/member/trash/restore/TodoappMemberTrashController";
import { TodoappMembersController } from "./controllers/todoApp/members/TodoappMembersController";

@Module({
  controllers: [
    TodoappAuthGuestController,
    TodoappAuthMemberController,
    TodoappMembersController,
    TodoappMemberProfileController,
    TodoappGuestsController,
    TodoappGuestSessionsController,
    TodoappMemberPassword_resetsController,
    TodoappMemberEmail_verificationsController,
    TodoappMemberTodosController,
    TodoappMemberTodosTrashController,
    TodoappMemberTrashController,
    TodoappMemberTodosSnapshotsController,
    TodoappMemberTodosCompleteController,
  ],
})
export class MyModule {}
