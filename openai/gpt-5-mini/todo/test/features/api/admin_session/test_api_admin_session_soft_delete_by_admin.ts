import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAdminSession";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminSession";

export async function test_api_admin_session_soft_delete_by_admin(
  connection: api.IConnection,
) {
  // 1) Create an isolated admin account via POST /auth/admin/join
  const adminInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd123", // meets min length requirement (>=8)
    display_name: RandomGenerator.name(),
    role: "support",
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://referrer.example.com/",
  } satisfies ITodoAppAdmin.ICreate;

  const authorized: ITodoAppAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminInput,
    });
  typia.assert(authorized);
  const adminId: string & tags.Format<"uuid"> = authorized.id;

  // 2) List admin sessions to obtain a sessionId to delete
  const sessionsPage: IPageITodoAppAdminSession.ISummary =
    await api.functional.todoApp.admin.admins.sessions.index(connection, {
      adminId,
      body: {} satisfies ITodoAppAdminSession.IRequest,
    });
  typia.assert(sessionsPage);

  // Ensure at least one session exists
  TestValidator.predicate(
    "admin has at least one session",
    sessionsPage.data.length > 0,
  );

  const sessionIdToDelete: string & tags.Format<"uuid"> =
    sessionsPage.data[0].id;

  // 3) Delete the chosen session
  await api.functional.todoApp.admin.admins.sessions.erase(connection, {
    adminId,
    sessionId: sessionIdToDelete,
  });

  // 4) Confirm post-condition by listing sessions again and ensuring the
  // deleted session id is no longer present
  const sessionsAfter: IPageITodoAppAdminSession.ISummary =
    await api.functional.todoApp.admin.admins.sessions.index(connection, {
      adminId,
      body: {} satisfies ITodoAppAdminSession.IRequest,
    });
  typia.assert(sessionsAfter);

  TestValidator.predicate(
    "deleted session must not appear in session list",
    sessionsAfter.data.every((s) => s.id !== sessionIdToDelete),
  );

  // 5) Negative case: invalid UUID format => expect 400 Bad Request
  await TestValidator.httpError(
    "invalid UUIDs should return 400",
    400,
    async () => {
      await api.functional.todoApp.admin.admins.sessions.erase(connection, {
        adminId: "not-a-uuid",
        sessionId: "also-not-a-uuid",
      });
    },
  );

  // 6) Negative case: syntactically valid but non-existent sessionId => expect 404
  let nonExistentSessionId = typia.random<string & tags.Format<"uuid">>();
  // Ensure we don't accidentally pick the same id as one of returned sessions
  if (nonExistentSessionId === sessionIdToDelete) {
    nonExistentSessionId = typia.random<string & tags.Format<"uuid">>();
  }

  await TestValidator.httpError(
    "non-existent session should return 404",
    404,
    async () => {
      await api.functional.todoApp.admin.admins.sessions.erase(connection, {
        adminId,
        sessionId: nonExistentSessionId,
      });
    },
  );
}
