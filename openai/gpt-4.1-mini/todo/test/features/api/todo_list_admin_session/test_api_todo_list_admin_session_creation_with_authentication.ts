import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminSession";

export async function test_api_todo_list_admin_session_creation_with_authentication(
  connection: api.IConnection,
) {
  // 1. Admin registration
  const adminEmail = `${RandomGenerator.alphaNumeric(8)}@example.com`;
  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "testPassword123",
      } satisfies ITodoListAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create admin session
  const sessionCreationBody = {
    ip: `${RandomGenerator.pick(["192", "172", "10"])}.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>>()}.
    ${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>>()}.
    ${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>>()}`.replace(
      /\s/g,
      "",
    ),
    href: `https://${RandomGenerator.alphaNumeric(5)}.com/admin/dashboard`,
    referrer: `https://${RandomGenerator.alphaNumeric(5)}.com/login`,
  } satisfies ITodoListAdminSession.ICreate;

  const session: ITodoListAdminSession =
    await api.functional.todoList.admin.todoListAdmins.todoListAdminSessions.create(
      connection,
      {
        todoListAdminId: admin.id,
        body: sessionCreationBody,
      },
    );
  typia.assert(session);

  TestValidator.equals(
    "admin id in session matches created admin",
    session.todoListAdminId,
    admin.id,
  );
  TestValidator.equals(
    "session ip matches input",
    session.ip,
    sessionCreationBody.ip,
  );
  TestValidator.equals(
    "session href matches input",
    session.href,
    sessionCreationBody.href,
  );
  TestValidator.equals(
    "session referrer matches input",
    session.referrer,
    sessionCreationBody.referrer,
  );
  TestValidator.predicate(
    "session created_at is valid ISO date",
    !isNaN(Date.parse(session.created_at)),
  );
  TestValidator.predicate(
    "session expired_at is null or undefined",
    session.expired_at === null || session.expired_at === undefined,
  );
}
