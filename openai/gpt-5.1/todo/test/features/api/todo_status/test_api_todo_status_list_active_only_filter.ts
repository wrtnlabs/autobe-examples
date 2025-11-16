import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoStatus";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";
import type { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";

/**
 * Validate that the Todo status listing endpoint honors the `isActiveOnly`
 * filter.
 *
 * Business goal: Ensure that when clients request only active Todo statuses
 * through PATCH /todoApp/todoStatuses with `isActiveOnly: true`, the backend
 * returns exclusively active statuses from the `todo_app_todo_statuses`
 * catalogue and excludes any inactive entries. Also verify that when
 * `isActiveOnly` is not enforced, inactive statuses may appear.
 *
 * High-level flow:
 *
 * 1. Register a todoAdmin account via POST /auth/todoAdmin/join to obtain an
 *    authenticated administrative context.
 * 2. As this todoAdmin, create a small catalogue of Todo statuses via POST
 *    /todoApp/todoAdmin/todoStatuses, mixing active and inactive entries.
 * 3. Call PATCH /todoApp/todoStatuses with `isActiveOnly: true` and a sufficiently
 *    large `limit`.
 * 4. Assert that only active statuses are returned and that the inactive ones
 *    created in step 2 are not present.
 * 5. Optionally, call the same endpoint without `isActiveOnly` (or with it set to
 *    false) and verify that inactive statuses can appear.
 */
export async function test_api_todo_status_list_active_only_filter(
  connection: api.IConnection,
) {
  // 1. Register a todoAdmin account and establish authenticated context
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

  // 2. Create a mix of active and inactive Todo statuses as todoAdmin
  const activeStatusBodies: ITodoAppTodoStatus.ICreate[] = [
    {
      code: `ACTIVE_${RandomGenerator.alphaNumeric(8)}`,
      label: "Active Status 1",
      description: RandomGenerator.paragraph({ sentences: 3 }),
      group: "test-group",
      sort_order: 1 as number & tags.Type<"int32">,
      is_default: true,
      is_active: true,
    },
    {
      code: `ACTIVE_${RandomGenerator.alphaNumeric(8)}`,
      label: "Active Status 2",
      description: RandomGenerator.paragraph({ sentences: 3 }),
      group: "test-group",
      sort_order: 2 as number & tags.Type<"int32">,
      is_default: false,
      is_active: true,
    },
  ];

  const inactiveStatusBody: ITodoAppTodoStatus.ICreate = {
    code: `INACTIVE_${RandomGenerator.alphaNumeric(8)}`,
    label: "Inactive Status",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    group: "test-group",
    sort_order: 3 as number & tags.Type<"int32">,
    is_default: false,
    is_active: false,
  };

  const createdActiveStatuses: ITodoAppTodoStatus[] = [];
  for (const body of activeStatusBodies) {
    const created: ITodoAppTodoStatus =
      await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
        body,
      });
    typia.assert(created);
    createdActiveStatuses.push(created);
  }

  const createdInactiveStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: inactiveStatusBody,
    });
  typia.assert(createdInactiveStatus);

  // 3. Call PATCH /todoApp/todoStatuses with isActiveOnly: true
  const listActiveOnlyBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    isActiveOnly: true,
    sortKey: "sort_order" as const,
    sortDirection: "asc" as const,
  } satisfies ITodoAppTodoStatus.IRequest;

  const activeOnlyPage: IPageITodoAppTodoStatus.ISummary =
    await api.functional.todoApp.todoStatuses.index(connection, {
      body: listActiveOnlyBody,
    });
  typia.assert(activeOnlyPage);

  // 4. Assert all returned statuses are active
  for (const status of activeOnlyPage.data) {
    TestValidator.predicate(
      "every listed status must be active when isActiveOnly is true",
      status.is_active === true,
    );
  }

  // Ensure at least one of the known active statuses appears in the active-only list
  const activeIds = createdActiveStatuses.map((s) => s.id);
  const foundKnownActive = activeOnlyPage.data.some((s) =>
    activeIds.includes(s.id),
  );
  TestValidator.predicate(
    "at least one known active status should appear in active-only result",
    foundKnownActive,
  );

  // Ensure the known inactive status does not appear when isActiveOnly is true
  const foundInactiveInActiveOnly = activeOnlyPage.data.some(
    (s) => s.id === createdInactiveStatus.id,
  );
  TestValidator.predicate(
    "inactive status must not appear in active-only result",
    foundInactiveInActiveOnly === false,
  );

  // 5. Optionally call without isActiveOnly (or with false) and verify
  const listAllBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    isActiveOnly: false,
    sortKey: "sort_order" as const,
    sortDirection: "asc" as const,
  } satisfies ITodoAppTodoStatus.IRequest;

  const allStatusesPage: IPageITodoAppTodoStatus.ISummary =
    await api.functional.todoApp.todoStatuses.index(connection, {
      body: listAllBody,
    });
  typia.assert(allStatusesPage);

  // Active-only result should not have more records than the full listing
  TestValidator.predicate(
    "total records with active-only filter should be less than or equal to all statuses",
    activeOnlyPage.pagination.records <= allStatusesPage.pagination.records,
  );

  // At least one inactive status should appear when isActiveOnly is false (if dataset permits)
  const hasInactiveInAll = allStatusesPage.data.some(
    (s) => s.is_active === false,
  );
  TestValidator.predicate(
    "inactive status should appear when isActiveOnly is false",
    hasInactiveInAll,
  );
}
