import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";
import type { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";

/**
 * Verify that updating a todoAdmin profile without a valid authentication
 * context is rejected.
 *
 * Business goal: Ensure that the privileged endpoint PUT
 * /todoApp/todoAdmin/todoAdmins/{todoAdminId}, which updates non-credential
 * fields (like display_name or status) of an administrative account, cannot be
 * used by unauthenticated clients. Unauthorized callers must receive an error
 * instead of an updated admin record.
 *
 * High-level steps:
 *
 * 1. Register a new todoAdmin account using /auth/todoAdmin/join to obtain a valid
 *    administrative identity and token.
 * 2. As an authenticated admin, create at least one Todo status via POST
 *    /todoApp/todoAdmin/todoStatuses, satisfying the scenario's prerequisite
 *    that status catalogue data exists.
 * 3. Prepare an ITodoAppTodoAdmin.IUpdate payload that would change mutable fields
 *    such as display_name and status.
 * 4. Construct a new IConnection instance with an empty headers object to simulate
 *    a completely unauthenticated client (no Authorization).
 * 5. Perform the update call using this unauthenticated connection and assert,
 *    using TestValidator.error, that the operation fails rather than returning
 *    a successful ITodoAppTodoAdmin record.
 *
 * Due to the limited API surface provided (no dedicated admin GET by id), we
 * validate behavior purely through the error condition on the unauthorized
 * update attempt rather than re-reading the admin record to compare pre- and
 * post-state.
 */
export async function test_api_todoadmin_profile_update_unauthorized(
  connection: api.IConnection,
) {
  // 1. Register a new todoAdmin account (join) and obtain authorized context
  const joinBody = typia.random<ITodoAppTodoAdminJoin.IRequest>();
  const authorized: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<ITodoAppTodoAdmin.IAuthorized>(authorized);

  // 2. Create at least one Todo status as an authenticated admin
  //    (using the token implicitly set by the join call).
  const statusCodeSuffix = RandomGenerator.alphabets(8);
  const statusCreateBody = {
    code: `ACTIVE_${statusCodeSuffix}`,
    label: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    group: "core",
    sort_order: 1 as number & tags.Type<"int32">,
    is_default: true,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const createdStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: statusCreateBody,
    });
  typia.assert<ITodoAppTodoStatus>(createdStatus);

  // 3. Prepare update payload that would change display_name and status
  const updateBody = {
    display_name: RandomGenerator.paragraph({ sentences: 1 }),
    status: "suspended",
  } satisfies ITodoAppTodoAdmin.IUpdate;

  // 4. Build an unauthenticated connection, with empty headers, to simulate
  //    a client that has no Authorization token at all.
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 5. Attempt the unauthorized update and assert that it fails.
  await TestValidator.error(
    "todoAdmin profile update without auth must fail",
    async () => {
      await api.functional.todoApp.todoAdmin.todoAdmins.update(
        unauthConnection,
        {
          todoAdminId: authorized.id,
          body: updateBody,
        },
      );
    },
  );
}
