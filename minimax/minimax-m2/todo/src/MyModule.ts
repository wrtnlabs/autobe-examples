import { Module } from "@nestjs/common";

import { AuthMemberJoinController } from "./controllers/auth/member/join/AuthMemberJoinController";
import { AuthMemberLoginController } from "./controllers/auth/member/login/AuthMemberLoginController";
import { AuthMemberRefreshController } from "./controllers/auth/member/refresh/AuthMemberRefreshController";
import { AuthAdminController } from "./controllers/auth/admin/AuthAdminController";
import { TodoappAdminAuthSessionsController } from "./controllers/todoApp/admin/auth/sessions/TodoappAdminAuthSessionsController";
import { TodoappAuthSessionsController } from "./controllers/todoApp/auth/sessions/TodoappAuthSessionsController";
import { TodoappAdminMembersController } from "./controllers/todoApp/admin/members/TodoappAdminMembersController";
import { TodoappMemberMembersController } from "./controllers/todoApp/member/members/TodoappMemberMembersController";
import { TodoappMemberMembersProfileController } from "./controllers/todoApp/member/members/profile/TodoappMemberMembersProfileController";
import { TodoappMemberMembersTodosController } from "./controllers/todoApp/member/members/todos/TodoappMemberMembersTodosController";
import { TodoappAdminMembersAuditlogsController } from "./controllers/todoApp/admin/members/auditLogs/TodoappAdminMembersAuditlogsController";
import { TodoappAdminAdministratorsController } from "./controllers/todoApp/admin/administrators/TodoappAdminAdministratorsController";
import { TodoappAdministratorsController } from "./controllers/todoApp/administrators/TodoappAdministratorsController";
import { TodoappAdminAdministratorsProfileController } from "./controllers/todoApp/admin/administrators/profile/TodoappAdminAdministratorsProfileController";
import { TodoappAdminAdministratorsTodosController } from "./controllers/todoApp/admin/administrators/todos/TodoappAdminAdministratorsTodosController";
import { TodoappAdminAdministratorsAuditlogsController } from "./controllers/todoApp/admin/administrators/auditLogs/TodoappAdminAdministratorsAuditlogsController";
import { TodoappMemberTodosController } from "./controllers/todoApp/member/todos/TodoappMemberTodosController";
import { TodoappAdminTodosController } from "./controllers/todoApp/admin/todos/TodoappAdminTodosController";
import { TodoappTodosController } from "./controllers/todoApp/todos/TodoappTodosController";
import { TodoappAdminSystemAuditlogsController } from "./controllers/todoApp/admin/system/auditLogs/TodoappAdminSystemAuditlogsController";
import { TodoappAdminSystemMetadataController } from "./controllers/todoApp/admin/system/metadata/TodoappAdminSystemMetadataController";

@Module({
  controllers: [
    AuthMemberJoinController,
    AuthMemberLoginController,
    AuthMemberRefreshController,
    AuthAdminController,
    TodoappAdminAuthSessionsController,
    TodoappAuthSessionsController,
    TodoappAdminMembersController,
    TodoappMemberMembersController,
    TodoappMemberMembersProfileController,
    TodoappMemberMembersTodosController,
    TodoappAdminMembersAuditlogsController,
    TodoappAdminAdministratorsController,
    TodoappAdministratorsController,
    TodoappAdminAdministratorsProfileController,
    TodoappAdminAdministratorsTodosController,
    TodoappAdminAdministratorsAuditlogsController,
    TodoappMemberTodosController,
    TodoappAdminTodosController,
    TodoappTodosController,
    TodoappAdminSystemAuditlogsController,
    TodoappAdminSystemMetadataController,
  ],
})
export class MyModule {}
