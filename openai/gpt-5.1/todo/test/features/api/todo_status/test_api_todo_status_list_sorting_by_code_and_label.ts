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
 * Validate sorting behavior of Todo status list by `code` and `label`.
 *
 * Business purpose:
 *
 * - Ensure that the public Todo status listing endpoint (PATCH
 *   /todoApp/todoStatuses) properly sorts records when `sortKey` is `"code"` or
 *   `"label"` and `sortDirection` is `"asc"` or `"desc"`.
 * - Guarantee deterministic ordering for UI dropdowns and configuration panels
 *   using status catalogues.
 *
 * Scenario steps:
 *
 * 1. Register a new todoAdmin account via /auth/todoAdmin/join.
 * 2. As the authenticated admin, create multiple Todo status records with distinct
 *    `code` and `label` values that have a clear lexicographical order: e.g.
 *    ALPHA/Alpha, BRAVO/Bravo, CHARLIE/Charlie.
 * 3. List Todo statuses with sortKey `"code"`, direction `"asc"` and a `limit`
 *    that ensures all created statuses fit on one page.
 * 4. Verify that the subset of returned records matching the created status IDs
 *    are ordered ascending by `code`.
 * 5. List again with sortKey `"code"`, direction `"desc"` and verify that, for the
 *    created subset, ordering is the reverse of the ascending result.
 * 6. Repeat steps 3–5 using sortKey `"label"` instead of `"code"`, and validate
 *    ordering by `label`.
 * 7. Confirm that all created statuses appear in each listing and that pagination
 *    metadata is consistent with the number of records found.
 */
export async function test_api_todo_status_list_sorting_by_code_and_label(
  connection: api.IConnection,
) {
  // 1. Register a todoAdmin to obtain an authenticated context.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://todo.example.com/admin/join",
    referrer: "https://todo.example.com/landing",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const admin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);
  typia.assert<IAuthorizationToken>(admin.token);

  // 2. Create several deterministic Todo status records.
  const statusInputs: ITodoAppTodoStatus.ICreate[] = [
    {
      code: "ALPHA",
      label: "Alpha",
      description: "First test status for sorting by code and label",
      group: "sorting-test",
      sort_order: 1 as number & tags.Type<"int32">,
      is_default: true,
      is_active: true,
    },
    {
      code: "BRAVO",
      label: "Bravo",
      description: "Second test status",
      group: "sorting-test",
      sort_order: 2 as number & tags.Type<"int32">,
      is_default: false,
      is_active: true,
    },
    {
      code: "CHARLIE",
      label: "Charlie",
      description: "Third test status",
      group: "sorting-test",
      sort_order: 3 as number & tags.Type<"int32">,
      is_default: false,
      is_active: true,
    },
  ];

  const createdStatuses: ITodoAppTodoStatus[] = [];
  for (const body of statusInputs) {
    const created: ITodoAppTodoStatus =
      await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
        body,
      });
    typia.assert(created);
    createdStatuses.push(created);
  }

  // Helper to map IDs for easier comparisons.
  const createdIds: string[] = createdStatuses.map((s) => s.id);

  // Helper function: assert that an array of summaries contains
  // all created IDs and is sorted by a specific key.
  const assertSortedSubset = (
    titlePrefix: string,
    data: ITodoAppTodoStatus.ISummary[],
    key: "code" | "label",
    direction: "asc" | "desc",
  ) => {
    const subset = data.filter((row) => createdIds.includes(row.id));

    TestValidator.equals(
      `${titlePrefix} - subset length`,
      subset.length,
      createdIds.length,
    );

    const subsetIdsSortedByKey = [...subset]
      .sort((a, b) =>
        direction === "asc"
          ? a[key].localeCompare(b[key])
          : b[key].localeCompare(a[key]),
      )
      .map((s) => s.id);

    const actualOrderIds = subset.map((s) => s.id);

    TestValidator.equals(
      `${titlePrefix} - ordering by ${key} (${direction})`,
      actualOrderIds,
      subsetIdsSortedByKey,
    );
  };

  // 3. List by code ascending.
  const listByCodeAscBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
    query: undefined,
    isActiveOnly: undefined,
    sortKey: "code" as const,
    sortDirection: "asc" as const,
  } satisfies ITodoAppTodoStatus.IRequest;

  const listByCodeAsc: IPageITodoAppTodoStatus.ISummary =
    await api.functional.todoApp.todoStatuses.index(connection, {
      body: listByCodeAscBody,
    });
  typia.assert(listByCodeAsc);

  TestValidator.predicate(
    "pagination.records should be >= created count (code asc)",
    listByCodeAsc.pagination.records >= createdStatuses.length,
  );

  assertSortedSubset("sort by code asc", listByCodeAsc.data, "code", "asc");

  // 4. List by code descending.
  const listByCodeDescBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
    query: undefined,
    isActiveOnly: undefined,
    sortKey: "code" as const,
    sortDirection: "desc" as const,
  } satisfies ITodoAppTodoStatus.IRequest;

  const listByCodeDesc: IPageITodoAppTodoStatus.ISummary =
    await api.functional.todoApp.todoStatuses.index(connection, {
      body: listByCodeDescBody,
    });
  typia.assert(listByCodeDesc);

  TestValidator.predicate(
    "pagination.records should be >= created count (code desc)",
    listByCodeDesc.pagination.records >= createdStatuses.length,
  );

  assertSortedSubset("sort by code desc", listByCodeDesc.data, "code", "desc");

  // Compare asc vs desc subset ordering for created IDs.
  const ascSubsetIds = listByCodeAsc.data
    .filter((row) => createdIds.includes(row.id))
    .map((row) => row.id);
  const descSubsetIds = listByCodeDesc.data
    .filter((row) => createdIds.includes(row.id))
    .map((row) => row.id);

  const reversedAscSubsetIds = [...ascSubsetIds].reverse();

  TestValidator.equals(
    "descending code order should be reverse of ascending for created subset",
    descSubsetIds,
    reversedAscSubsetIds,
  );

  // 5. List by label ascending.
  const listByLabelAscBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
    query: undefined,
    isActiveOnly: undefined,
    sortKey: "label" as const,
    sortDirection: "asc" as const,
  } satisfies ITodoAppTodoStatus.IRequest;

  const listByLabelAsc: IPageITodoAppTodoStatus.ISummary =
    await api.functional.todoApp.todoStatuses.index(connection, {
      body: listByLabelAscBody,
    });
  typia.assert(listByLabelAsc);

  TestValidator.predicate(
    "pagination.records should be >= created count (label asc)",
    listByLabelAsc.pagination.records >= createdStatuses.length,
  );
  assertSortedSubset("sort by label asc", listByLabelAsc.data, "label", "asc");

  // 6. List by label descending.
  const listByLabelDescBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
    query: undefined,
    isActiveOnly: undefined,
    sortKey: "label" as const,
    sortDirection: "desc" as const,
  } satisfies ITodoAppTodoStatus.IRequest;

  const listByLabelDesc: IPageITodoAppTodoStatus.ISummary =
    await api.functional.todoApp.todoStatuses.index(connection, {
      body: listByLabelDescBody,
    });
  typia.assert(listByLabelDesc);

  TestValidator.predicate(
    "pagination.records should be >= created count (label desc)",
    listByLabelDesc.pagination.records >= createdStatuses.length,
  );
  assertSortedSubset(
    "sort by label desc",
    listByLabelDesc.data,
    "label",
    "desc",
  );

  const ascLabelSubsetIds = listByLabelAsc.data
    .filter((row) => createdIds.includes(row.id))
    .map((row) => row.id);
  const descLabelSubsetIds = listByLabelDesc.data
    .filter((row) => createdIds.includes(row.id))
    .map((row) => row.id);
  const reversedAscLabelSubsetIds = [...ascLabelSubsetIds].reverse();

  TestValidator.equals(
    "descending label order should be reverse of ascending for created subset",
    descLabelSubsetIds,
    reversedAscLabelSubsetIds,
  );
}
