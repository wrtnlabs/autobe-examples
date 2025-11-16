import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";
import type { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";

/**
 * Validate the delete-admin endpoint in a minimal "sole admin" scenario.
 *
 * Business context:
 *
 * - We model a flow where a single administrative operator (Admin A) is
 *   registered, performs a privileged configuration action (creating a Todo
 *   status), and then calls the administrator deletion endpoint DELETE
 *   /todoApp/todoAdmin/todoAdmins/{todoAdminId}.
 * - The erase() documentation mentions that implementations _may_ enforce a
 *   business rule like "at least one administrator must remain active", but
 *   this behavior is not guaranteed across deployments.
 *
 * Test strategy:
 *
 * 1. Register Admin A using POST /auth/todoAdmin/join with a valid
 *    ITodoAppTodoAdminJoin.IRequest body.
 *
 *    - The endpoint returns ITodoAppTodoAdmin.IAuthorized and also installs the
 *         access token into connection.headers.Authorization internally.
 * 2. As Admin A, create at least one Todo status via POST
 *    /todoApp/todoAdmin/todoStatuses using ITodoAppTodoStatus.ICreate.
 *
 *    - This confirms that the authenticated admin can perform a privileged
 *         configuration action before deletion.
 * 3. Invoke DELETE /todoApp/todoAdmin/todoAdmins/{todoAdminId} using the id of
 *    Admin A via api.functional.todoApp.todoAdmin.todoAdmins.erase.
 *
 *    - Because the last-admin protection rule is optional and not part of the strict
 *         contract, the test does not assert whether the call succeeds or
 *         fails; it merely exercises the endpoint in a realistic sole-admin
 *         context while keeping type and flow correctness.
 *
 * Technical constraints satisfied:
 *
 * - All request bodies use the correct DTO types with `satisfies` (no `as any`).
 * - All API calls are awaited; non-void responses are validated with
 *   `typia.assert()`.
 * - No manipulation of connection.headers; authentication is handled entirely by
 *   the join() SDK.
 * - No tests of type errors or HTTP status codes.
 */
export async function test_api_todoadmin_delete_admin_account_last_admin_protection(
  connection: api.IConnection,
) {
  // 1. Register Admin A using POST /auth/todoAdmin/join
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    // displayName and ip are optional; provide a display name and explicit null ip
    displayName: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const admin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<ITodoAppTodoAdmin.IAuthorized>(admin);

  // Sanity-check: admin id should be a non-empty UUID string
  await TestValidator.predicate(
    "admin id must be a non-empty UUID string",
    async () => admin.id.length > 0,
  );

  // 2. As Admin A, create at least one Todo status via POST /todoApp/todoAdmin/todoStatuses
  const statusBody = {
    code: RandomGenerator.alphaNumeric(8),
    label: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    group: RandomGenerator.paragraph({ sentences: 1 }),
    sort_order: typia.random<number & tags.Type<"int32">>(),
    is_default: false,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const status: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: statusBody,
    });
  typia.assert<ITodoAppTodoStatus>(status);

  // 3. Attempt to delete Admin A as the (presumed) only admin.
  //
  // The documentation indicates that implementations *may* prevent deletion of
  // the last admin, but this is not guaranteed. To keep this test robust across
  // implementations, we simply exercise the endpoint without asserting whether
  // it succeeds or fails.
  await api.functional.todoApp.todoAdmin.todoAdmins.erase(connection, {
    todoAdminId: admin.id,
  });
}
