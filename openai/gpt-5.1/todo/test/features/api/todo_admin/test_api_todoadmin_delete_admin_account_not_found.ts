import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";
import type { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";

/**
 * Validate behavior when deleting a non-existent Todo administrator account.
 *
 * Business goal: Ensure that DELETE /todoApp/todoAdmin/todoAdmins/{todoAdminId}
 * does not silently succeed when the specified administrator does not exist,
 * but instead responds with an HTTP error, while leaving existing
 * administrators intact and fully functional.
 *
 * High-level steps:
 *
 * 1. Register Admin A via /auth/todoAdmin/join to obtain an authorized todoAdmin
 *    session bound to the given connection.
 * 2. As Admin A, create an initial Todo status via /todoApp/todoAdmin/todoStatuses
 *    to verify that the admin context is working and to initialize catalogue
 *    data.
 * 3. Generate a UUID-style identifier that is guaranteed not to refer to any real
 *    admin in this scenario.
 * 4. Call DELETE /todoApp/todoAdmin/todoAdmins/{todoAdminId} with this
 *    non-existent ID and verify that an HTTP error is raised.
 * 5. After the failed delete attempt, perform another privileged operation as
 *    Admin A (e.g., create another Todo status) to confirm that the real admin
 *    account still exists and remains authorized.
 */
export async function test_api_todoadmin_delete_admin_account_not_found(
  connection: api.IConnection,
) {
  // 1. Register Admin A and obtain authorized context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
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

  // 2. Create an initial Todo status as Admin A to confirm context works
  const firstStatusBody = {
    code: RandomGenerator.alphaNumeric(8),
    label: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    group: RandomGenerator.paragraph({ sentences: 1 }),
    sort_order: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    is_default: false,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const firstStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: firstStatusBody,
    });
  typia.assert(firstStatus);

  // 3. Generate a non-existent admin ID (fresh random UUID)
  const nonExistentAdminId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Attempt to delete non-existent admin and ensure an HTTP error occurs
  await TestValidator.error(
    "delete non-existent admin should fail",
    async () => {
      await api.functional.todoApp.todoAdmin.todoAdmins.erase(connection, {
        todoAdminId: nonExistentAdminId,
      });
    },
  );

  // 5. Verify Admin A is still functional by creating another Todo status
  const secondStatusBody = {
    code: RandomGenerator.alphaNumeric(8),
    label: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    group: RandomGenerator.paragraph({ sentences: 1 }),
    sort_order: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    is_default: false,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const secondStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: secondStatusBody,
    });
  typia.assert(secondStatus);

  // Sanity check: both status records belong to the same catalogue and are distinct
  TestValidator.notEquals(
    "newly created statuses should have different IDs",
    firstStatus.id,
    secondStatus.id,
  );
}
