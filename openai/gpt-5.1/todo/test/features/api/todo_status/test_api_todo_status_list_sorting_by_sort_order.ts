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
 * Validate sorting of Todo status list by `sort_order` in both ascending and
 * descending directions.
 *
 * Business goal
 *
 * - Ensure that the public Todo status listing endpoint correctly honors the
 *   `sortKey` = "sort_order" and `sortDirection` = "asc" | "desc" contract.
 * - Ensure that list responses are stable and that switching sort direction
 *   reorders the same set of status summaries without changing their content.
 *
 * High-level flow
 *
 * 1. Register a todoAdmin account via POST /auth/todoAdmin/join so that subsequent
 *    administrative operations are authenticated.
 * 2. As this todoAdmin, create three Todo status rows via POST
 *    /todoApp/todoAdmin/todoStatuses with controlled `sort_order` values 10,
 *    20, and 30. Use distinct `code` and `label` values for each so we can
 *    identify them unambiguously.
 * 3. Call PATCH /todoApp/todoStatuses with a request body { page: 1, limit:
 *    largeEnough, sortKey: "sort_order", sortDirection: "asc" }.
 *
 *    - Validate the shape and types of the response using typia.assert.
 *    - Filter the returned `data` to the three created codes.
 *    - Assert that these three appear in ascending order of the configured
 *         `sort_order` (10, 20, 30) using TestValidator.equals.
 * 4. Call PATCH /todoApp/todoStatuses again with the same pagination and filters,
 *    but `sortDirection: "desc"`.
 *
 *    - Again validate the response shape with typia.assert.
 *    - Filter to the same three codes.
 *    - Assert that these three appear in descending order of `sort_order` (30, 20,
 *         10).
 * 5. Finally, assert that the sets of summaries obtained from the asc and desc
 *    calls are identical as sets (same id/code/label/is_default/is_active
 *    combinations), only ordered differently.
 */
export async function test_api_todo_status_list_sorting_by_sort_order(
  connection: api.IConnection,
) {
  // 1. Register a todoAdmin to obtain an authenticated context.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://todo-admin.test/join",
    referrer: "https://todo-admin.test/landing",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const admin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create three Todo status rows with deterministic sort_order values.
  const baseCodePrefix: string = RandomGenerator.alphabets(8).toUpperCase();

  const statusInputs: ITodoAppTodoStatus.ICreate[] = [
    {
      code: `${baseCodePrefix}_A`,
      label: `${baseCodePrefix} Label A`,
      description: "First status with sort_order 10",
      group: "sorting-test",
      sort_order: 10 as number & tags.Type<"int32">,
      is_default: false,
      is_active: true,
    },
    {
      code: `${baseCodePrefix}_B`,
      label: `${baseCodePrefix} Label B`,
      description: "Second status with sort_order 20",
      group: "sorting-test",
      sort_order: 20 as number & tags.Type<"int32">,
      is_default: false,
      is_active: true,
    },
    {
      code: `${baseCodePrefix}_C`,
      label: `${baseCodePrefix} Label C`,
      description: "Third status with sort_order 30",
      group: "sorting-test",
      sort_order: 30 as number & tags.Type<"int32">,
      is_default: false,
      is_active: true,
    },
  ];

  const createdStatuses: ITodoAppTodoStatus[] = [];
  for (const input of statusInputs) {
    const created = await api.functional.todoApp.todoAdmin.todoStatuses.create(
      connection,
      { body: input },
    );
    typia.assert(created);
    createdStatuses.push(created);
  }

  // Helper: map of code -> sort_order for our created statuses
  const createdByCode = new Map<string, ITodoAppTodoStatus>(
    createdStatuses.map((s) => [s.code, s]),
  );

  // 3. List statuses sorted ascending by sort_order.
  const ascResponse: IPageITodoAppTodoStatus.ISummary =
    await api.functional.todoApp.todoStatuses.index(connection, {
      body: {
        page: 1 as number & tags.Type<"int32">,
        limit: 50 as number & tags.Type<"int32">,
        query: undefined,
        isActiveOnly: undefined,
        sortKey: "sort_order",
        sortDirection: "asc",
      } satisfies ITodoAppTodoStatus.IRequest,
    });
  typia.assert(ascResponse);

  const ascDataForCodes: ITodoAppTodoStatus.ISummary[] =
    ascResponse.data.filter((summary) => createdByCode.has(summary.code));

  TestValidator.equals(
    "all three created statuses must appear in ascending result set",
    ascDataForCodes.length,
    createdStatuses.length,
  );

  const ascCodes = ascDataForCodes.map((s) => s.code);

  // 4. List statuses sorted descending by sort_order.
  const descResponse: IPageITodoAppTodoStatus.ISummary =
    await api.functional.todoApp.todoStatuses.index(connection, {
      body: {
        page: 1 as number & tags.Type<"int32">,
        limit: 50 as number & tags.Type<"int32">,
        query: undefined,
        isActiveOnly: undefined,
        sortKey: "sort_order",
        sortDirection: "desc",
      } satisfies ITodoAppTodoStatus.IRequest,
    });
  typia.assert(descResponse);

  const descDataForCodes: ITodoAppTodoStatus.ISummary[] =
    descResponse.data.filter((summary) => createdByCode.has(summary.code));

  TestValidator.equals(
    "all three created statuses must appear in descending result set",
    descDataForCodes.length,
    createdStatuses.length,
  );

  const descCodes = descDataForCodes.map((s) => s.code);

  // 5. Verify ascending vs descending order and same record sets.
  const expectedAscCodes = [
    statusInputs[0].code,
    statusInputs[1].code,
    statusInputs[2].code,
  ];
  const expectedDescCodes = [...expectedAscCodes].reverse();

  TestValidator.equals(
    "ascending list should be ordered by configured sort_order ascending",
    ascCodes,
    expectedAscCodes,
  );

  TestValidator.equals(
    "descending list should be ordered by configured sort_order descending",
    descCodes,
    expectedDescCodes,
  );

  // Compare sets of summaries for equality (ignoring order).
  const sortSummaries = (items: ITodoAppTodoStatus.ISummary[]) =>
    [...items].sort((a, b) => a.code.localeCompare(b.code));

  const ascSortedByCode = sortSummaries(ascDataForCodes);
  const descSortedByCode = sortSummaries(descDataForCodes);

  TestValidator.equals(
    "asc/desc result sets should have identical summaries when sorted by code",
    ascSortedByCode,
    descSortedByCode,
  );
}
