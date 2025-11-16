import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";
import type { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";

/**
 * Validate self-deletion behavior for a todoAdmin account.
 *
 * Business goal:
 *
 * - Ensure that an authenticated todoAdmin (Admin A) can successfully invoke the
 *   DELETE /todoApp/todoAdmin/todoAdmins/{todoAdminId} endpoint targeting their
 *   own administrator record, using only the APIs provided.
 * - Demonstrate a realistic privileged workflow (creating a Todo status) that
 *   depends on the authenticated admin context prior to deletion.
 *
 * Due to the limited API surface exposed to this test (no admin lookup or
 * re-login endpoints), we cannot directly verify that the admin row is removed
 * from persistence or that the token becomes invalid after deletion. Instead,
 * this test focuses on the happy-path guarantee that self-deletion completes
 * without server-side errors when invoked by the owner admin.
 *
 * High-level steps:
 *
 * 1. Register Admin A via POST /auth/todoAdmin/join and obtain
 *    ITodoAppTodoAdmin.IAuthorized, which automatically attaches the JWT access
 *    token to the connection.
 * 2. While authenticated as Admin A, perform a privileged operation: POST
 *    /todoApp/todoAdmin/todoStatuses to create a new Todo status record.
 * 3. Call DELETE /todoApp/todoAdmin/todoAdmins/{todoAdminId} with Admin A's own
 *    id, and assert that the operation completes without throwing.
 */
export async function test_api_todoadmin_delete_admin_account_self_deletion_policy(
  connection: api.IConnection,
) {
  // 1. Register Admin A and obtain authorized context + JWT token.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const admin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // Basic sanity checks on the authenticated admin context.
  await TestValidator.predicate(
    "todoAdmin join must return an authorized admin with uuid id",
    async () => {
      return (
        typeof admin.id === "string" &&
        admin.id.length > 0 &&
        typeof admin.email === "string" &&
        admin.email.length > 0
      );
    },
  );

  // 2. While authenticated as Admin A, create a Todo status entry.
  const statusBody = {
    code: `ACTIVE_${RandomGenerator.alphaNumeric(8)}`,
    label: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    group: "core",
    sort_order: typia.random<number & tags.Type<"int32">>(),
    is_default: true,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const status: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: statusBody,
    });
  typia.assert(status);

  TestValidator.equals(
    "created Todo status must echo the requested business code",
    status.code,
    statusBody.code,
  );

  // 3. Attempt self-deletion: Admin A deletes their own administrator record.
  //
  // The erase endpoint returns void on success. We assert only that it
  // completes without throwing an HttpError, which indicates that self-deletion
  // is allowed by the current business rules for this backend.
  await api.functional.todoApp.todoAdmin.todoAdmins.erase(connection, {
    todoAdminId: admin.id,
  });
}
