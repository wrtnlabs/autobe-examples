import { Module } from "@nestjs/common";

import { TodoappAuthGuestJoinController } from "./controllers/todoApp/auth/guest/join/TodoappAuthGuestJoinController";
import { TodoappAuthGuestRefreshController } from "./controllers/todoApp/auth/guest/refresh/TodoappAuthGuestRefreshController";
import { TodoappAuthMemberController } from "./controllers/todoApp/auth/member/TodoappAuthMemberController";
import { TodoappGuestSessionsController } from "./controllers/todoApp/guest/sessions/TodoappGuestSessionsController";
import { TodoappGuestsController } from "./controllers/todoApp/guests/TodoappGuestsController";
import { TodoappMemberEmail_verificationsController } from "./controllers/todoApp/member/email-verifications/TodoappMemberEmail_verificationsController";
import { TodoappMemberMembersController } from "./controllers/todoApp/member/members/TodoappMemberMembersController";
import { TodoappMemberPassword_resetsController } from "./controllers/todoApp/member/password-resets/TodoappMemberPassword_resetsController";
import { TodoappMemberProfileController } from "./controllers/todoApp/member/profile/TodoappMemberProfileController";
import { TodoappMemberProfilesController } from "./controllers/todoApp/member/profiles/TodoappMemberProfilesController";
import { TodoappMemberTodosController } from "./controllers/todoApp/member/todos/TodoappMemberTodosController";
import { TodoappMemberTodosHistory_entriesController } from "./controllers/todoApp/member/todos/history-entries/TodoappMemberTodosHistory_entriesController";
import { TodoappMemberTodosHistoryController } from "./controllers/todoApp/member/todos/history/TodoappMemberTodosHistoryController";
import { TodoappMemberTodosHistoryOrderindexesController } from "./controllers/todoApp/member/todos/history/orderIndexes/TodoappMemberTodosHistoryOrderindexesController";
import { TodoappMemberTodosRestoreController } from "./controllers/todoApp/member/todos/restore/TodoappMemberTodosRestoreController";
import { TodoappMemberTodosSnapshotsController } from "./controllers/todoApp/member/todos/snapshots/TodoappMemberTodosSnapshotsController";

@Module({
  controllers: [
    TodoappAuthGuestJoinController,
    TodoappAuthGuestRefreshController,
    TodoappAuthMemberController,
    TodoappGuestsController,
    TodoappGuestSessionsController,
    TodoappMemberMembersController,
    TodoappMemberPassword_resetsController,
    TodoappMemberEmail_verificationsController,
    TodoappMemberProfileController,
    TodoappMemberProfilesController,
    TodoappMemberTodosController,
    TodoappMemberTodosRestoreController,
    TodoappMemberTodosHistory_entriesController,
    TodoappMemberTodosSnapshotsController,
    TodoappMemberTodosHistoryController,
    TodoappMemberTodosHistoryOrderindexesController,
  ],
})
export class MyModule {}
