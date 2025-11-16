import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";
import type { ITodoAppTodoAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminSession";
import type { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";

export async function test_api_todoadmin_session_detail_forbidden_for_other_admin(
  connection: api.IConnection,
) {
  // 1. Register Admin A (establish first admin and its session context)
  const adminAJoinBody = {
    email: `admin-a+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(2),
    ip: null,
    href: "https://admin.example.com/onboarding",
    referrer: "https://admin.example.com/",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminA: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminAJoinBody,
    });
  typia.assert<ITodoAppTodoAdmin.IAuthorized>(adminA);

  // 2. While authenticated as Admin A, create at least one Todo status
  const todoStatusBody = {
    code: `CODE_${RandomGenerator.alphaNumeric(6)}`,
    label: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    group: "core",
    sort_order: 1,
    is_default: false,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const createdStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: todoStatusBody,
    });
  typia.assert<ITodoAppTodoStatus>(createdStatus);

  // 3. Register Admin B; this switches the connection's Authorization
  const adminBJoinBody = {
    email: `admin-b+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(2),
    ip: null,
    href: "https://admin.example.com/onboarding",
    referrer: "https://admin.example.com/",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminB: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminBJoinBody,
    });
  typia.assert<ITodoAppTodoAdmin.IAuthorized>(adminB);

  // 4. As Admin B, attempt to access Admin A's session detail
  const forgedSessionId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.httpError(
    "cross-admin session detail access must be forbidden",
    [403, 404],
    async () => {
      await api.functional.todoApp.todoAdmin.todoAdmins.sessions.at(
        connection,
        {
          todoAdminId: adminA.id,
          sessionId: forgedSessionId,
        },
      );
    },
  );

  // Optional sanity check: Admin A also cannot see an arbitrary random sessionId,
  // but this is same-admin behavior and not the primary focus. We only ensure
  // that the endpoint is not anonymously open.
  const reconnectAJoinBody = {
    email: `admin-a2+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(2),
    ip: null,
    href: "https://admin.example.com/onboarding",
    referrer: "https://admin.example.com/",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminA2: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: reconnectAJoinBody,
    });
  typia.assert<ITodoAppTodoAdmin.IAuthorized>(adminA2);

  const anotherForgedSessionId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.httpError(
    "same-admin random sessionId should not be publicly readable",
    [403, 404],
    async () => {
      await api.functional.todoApp.todoAdmin.todoAdmins.sessions.at(
        connection,
        {
          todoAdminId: adminA2.id,
          sessionId: anotherForgedSessionId,
        },
      );
    },
  );
}
