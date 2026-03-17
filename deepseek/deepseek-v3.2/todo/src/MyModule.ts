import { Module } from "@nestjs/common";

import { TodoappAuthGuestController } from "./controllers/todoApp/auth/guest/TodoappAuthGuestController";
import { TodoappAuthMemberController } from "./controllers/todoApp/auth/member/TodoappAuthMemberController";
import { TodoappMemberEmail_verificationsController } from "./controllers/todoApp/member/email-verifications/TodoappMemberEmail_verificationsController";
import { TodoappMemberPassword_resetsController } from "./controllers/todoApp/member/password-resets/TodoappMemberPassword_resetsController";
import { TodoappMemberProfileController } from "./controllers/todoApp/member/profile/TodoappMemberProfileController";
import { TodoappMemberSessionsController } from "./controllers/todoApp/member/sessions/TodoappMemberSessionsController";
import { TodoappMemberTodosController } from "./controllers/todoApp/member/todos/TodoappMemberTodosController";
import { TodoappMemberTodosHistoriesController } from "./controllers/todoApp/member/todos/histories/TodoappMemberTodosHistoriesController";
import { TodoappMemberTodosHistoriesAttribute_changesController } from "./controllers/todoApp/member/todos/histories/attribute-changes/TodoappMemberTodosHistoriesAttribute_changesController";
import { TodoappMemberTodosHistoriesSnapshotController } from "./controllers/todoApp/member/todos/histories/snapshot/TodoappMemberTodosHistoriesSnapshotController";
import { TodoappMemberTodosTrashController } from "./controllers/todoApp/member/todos/trash/TodoappMemberTodosTrashController";
import { TodoappMembersController } from "./controllers/todoApp/members/TodoappMembersController";

@Module({
  controllers: [
    TodoappAuthGuestController,
    TodoappAuthMemberController,
    TodoappMembersController,
    TodoappMemberProfileController,
    TodoappMemberSessionsController,
    TodoappMemberPassword_resetsController,
    TodoappMemberEmail_verificationsController,
    TodoappMemberTodosController,
    TodoappMemberTodosTrashController,
    TodoappMemberTodosHistoriesController,
    TodoappMemberTodosHistoriesAttribute_changesController,
    TodoappMemberTodosHistoriesSnapshotController,
  ],
})
export class MyModule {}
