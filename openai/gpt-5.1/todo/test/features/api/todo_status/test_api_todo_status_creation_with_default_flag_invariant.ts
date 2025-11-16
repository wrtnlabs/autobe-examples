import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";
import type { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";

export async function test_api_todo_status_creation_with_default_flag_invariant(
  connection: api.IConnection,
) {
  /**
   * Scenario:
   *
   * - We need an authenticated todoAdmin to create statuses.
   * - We must verify that creating Todo statuses with is_default=true works and
   *   produce consistent data, while respecting the invariant that business
   *   rules will not allow broken state.
   * - Available APIs in this context:
   *
   *   - POST /auth/todoAdmin/join -> api.functional.auth.todoAdmin.join
   *   - POST /todoApp/todoAdmin/todoStatuses ->
   *       api.functional.todoApp.todoAdmin.todoStatuses.create
   * - No listing or detail endpoints for statuses are provided, so we validate
   *   behavior using only create responses and error expectations.
   *
   * Business rule interpretation (due to limited APIs):
   *
   * - We cannot query “all statuses” to see that only one is_default=true exists
   *   at a time.
   * - Instead, we validate that:
   *
   *   1. A first status with is_default=true can be created successfully.
   *   2. A second status with a different code and is_default=true can also be
   *        created successfully, so the system permits multiple default
   *        candidates at creation time.
   *   3. Both responses are structurally valid ITodoAppTodoStatus objects.
   * - We do NOT assert a particular rejection or auto-adjustment behavior when a
   *   second default is created, because that requires read/list APIs that do
   *   not exist in the provided SDK. Instead, this test focuses on positive
   *   creation flows and on authorization rules.
   *
   * Additionally, we validate authorization by ensuring that an unauthenticated
   * connection cannot create a status.
   */

  // 0. Prepare a fresh unauthenticated connection for negative auth test.
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 1. Try creating a status without admin token, expect failure.
  await TestValidator.error(
    "unauthenticated status creation should fail",
    async () => {
      await api.functional.todoApp.todoAdmin.todoStatuses.create(
        unauthenticatedConnection,
        {
          body: {
            code: "UNAUTH_TEST",
            label: "Unauth Test",
            description: RandomGenerator.paragraph({ sentences: 3 }),
            group: "test",
            sort_order: 1 as number & tags.Type<"int32">,
            is_default: true,
            is_active: true,
          } satisfies ITodoAppTodoStatus.ICreate,
        },
      );
    },
  );

  // 2. Register (join) a new todoAdmin to obtain authorized context.
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.todoapp.local/join",
    referrer: "https://admin.todoapp.local/landing",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const admin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert<ITodoAppTodoAdmin.IAuthorized>(admin);
  typia.assert<IAuthorizationToken>(admin.token);

  // 3. Create the first status with is_default=true and is_active=true.
  const firstStatusRequest = {
    code: "ACTIVE",
    label: "Active",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    group: "core",
    sort_order: 1 as number & tags.Type<"int32">,
    is_default: true,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const firstStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: firstStatusRequest,
    });
  typia.assert<ITodoAppTodoStatus>(firstStatus);

  TestValidator.equals(
    "first status code should match request",
    firstStatus.code,
    firstStatusRequest.code,
  );
  TestValidator.equals(
    "first status label should match request",
    firstStatus.label,
    firstStatusRequest.label,
  );
  TestValidator.equals(
    "first status is_default should be true",
    firstStatus.is_default,
    true,
  );
  TestValidator.equals(
    "first status is_active should be true",
    firstStatus.is_active,
    true,
  );

  // 4. Create a second status with a different code and is_default=true.
  const secondStatusRequest = {
    code: "COMPLETED",
    label: "Completed",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    group: "core",
    sort_order: 2 as number & tags.Type<"int32">,
    is_default: true,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const secondStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: secondStatusRequest,
    });
  typia.assert<ITodoAppTodoStatus>(secondStatus);

  TestValidator.equals(
    "second status code should match request",
    secondStatus.code,
    secondStatusRequest.code,
  );
  TestValidator.equals(
    "second status label should match request",
    secondStatus.label,
    secondStatusRequest.label,
  );
  TestValidator.equals(
    "second status is_default should be true",
    secondStatus.is_default,
    true,
  );
  TestValidator.equals(
    "second status is_active should be true",
    secondStatus.is_active,
    true,
  );

  // 5. Basic invariant sanity checks on returned objects.
  TestValidator.predicate(
    "first and second statuses must have different ids",
    firstStatus.id !== secondStatus.id,
  );
  TestValidator.predicate(
    "first and second statuses must have different codes",
    firstStatus.code !== secondStatus.code,
  );

  // Note: deeper enforcement of single-default invariant would require
  // read/list APIs to inspect the full catalogue, which are not available
  // in this context. This test focuses on authorization and that multiple
  // default-flagged statuses can be created successfully without violating
  // type contracts.
}
