import { Module } from "@nestjs/common";

import { PrivatetodoappAuthGuestController } from "./controllers/privateTodoApp/auth/guest/PrivatetodoappAuthGuestController";
import { PrivatetodoappAuthMemberController } from "./controllers/privateTodoApp/auth/member/PrivatetodoappAuthMemberController";
import { PrivatetodoappMemberProfileController } from "./controllers/privateTodoApp/member/profile/PrivatetodoappMemberProfileController";
import { PrivatetodoappMemberSessionsController } from "./controllers/privateTodoApp/member/sessions/PrivatetodoappMemberSessionsController";
import { PrivatetodoappMemberTodosController } from "./controllers/privateTodoApp/member/todos/PrivatetodoappMemberTodosController";
import { PrivatetodoappMemberTodosEdithistoriesController } from "./controllers/privateTodoApp/member/todos/editHistories/PrivatetodoappMemberTodosEdithistoriesController";
import { PrivatetodoappMemberTrashController } from "./controllers/privateTodoApp/member/trash/PrivatetodoappMemberTrashController";

@Module({
  controllers: [
    PrivatetodoappAuthGuestController,
    PrivatetodoappAuthMemberController,
    PrivatetodoappMemberProfileController,
    PrivatetodoappMemberSessionsController,
    PrivatetodoappMemberTodosController,
    PrivatetodoappMemberTrashController,
    PrivatetodoappMemberTodosEdithistoriesController,
  ],
})
export class MyModule {}
