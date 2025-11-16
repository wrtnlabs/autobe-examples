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
 * Validate free-text search over Todo statuses by `code` and `label`.
 *
 * Business goal: Ensure that the public listing endpoint PATCH
 * /todoApp/todoStatuses applies the `query` field from
 * ITodoAppTodoStatus.IRequest as a case-insensitive (or at least
 * substring-based) text filter over the `code` and `label` fields of Todo
 * status catalogue entries. The test sets up a controlled data set of statuses,
 * then issues search requests and inspects which statuses appear.
 *
 * High-level flow:
 *
 * 1. Register a todoAdmin administrator using POST /auth/todoAdmin/join so that we
 *    can create Todo status entries via the admin-only endpoint.
 * 2. As the authenticated todoAdmin, create three Todo statuses with intentionally
 *    distinct and recognizable `code` and `label` values:
 *
 *    - `ACTIVE_TASK` / `Active Task`
 *    - `ARCHIVED_TASK` / `Archived Task`
 *    - `PENDING_REVIEW` / `Pending Review` Ensure they are active (is_active = true)
 *         and have distinct sort_order so they can all appear in listings.
 * 3. Call PATCH /todoApp/todoStatuses with a `query` that should only match the
 *    first status (for example, `"Active"`).
 *
 *    - Use a small `limit` (e.g., 10) and page = 1 so all matching rows fit.
 *    - Assert that:
 *
 *         - The call succeeds and returns a valid IPageITodoAppTodoStatus.ISummary
 *         - The `data` array contains the ACTIVE_TASK status (by code/label)
 *         - The `data` array does NOT contain ARCHIVED_TASK or PENDING_REVIEW.
 * 4. Call PATCH /todoApp/todoStatuses again with a query that should match a
 *    different subset, e.g. `"Archived"` (matching ARCHIVED_TASK only) or
 *    `"Pending"` (matching PENDING_REVIEW only) and perform similar presence /
 *    absence checks.
 * 5. Optionally, call PATCH /todoApp/todoStatuses with `query` omitted or an empty
 *    string to confirm that the endpoint returns at least the three created
 *    statuses when no text filter is applied (subject to pagination).
 *
 * Assertions:
 *
 * - Use typia.assert() to validate response shapes for:
 *
 *   - ITodoAppTodoAdmin.IAuthorized from join
 *   - ITodoAppTodoStatus from create
 *   - IPageITodoAppTodoStatus.ISummary from index
 * - Use TestValidator.equals / TestValidator.notEquals / TestValidator.predicate
 *   with descriptive titles for business assertions, such as:
 *
 *   - "Active query returns ACTIVE_TASK only"
 *   - "Archived query excludes ACTIVE_TASK"
 * - Do not rely on behavior outside what the DTOs and comments guarantee; treat
 *   the search as substring matching over `code` and `label`.
 */
export async function test_api_todo_status_list_text_search_by_code_and_label(
  connection: api.IConnection,
) {
  // 1. Register a todoAdmin account so that we can create statuses.
  const adminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://todo-app.example.com/admin/join",
    referrer: "https://todo-app.example.com/landing",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const admin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create three Todo statuses with distinct code/label pairs.
  const activeStatusBody = {
    code: "ACTIVE_TASK",
    label: "Active Task",
    description: "Status used for currently active tasks",
    group: "lifecycle",
    sort_order: 1 as number & tags.Type<"int32">,
    is_default: true,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const archivedStatusBody = {
    code: "ARCHIVED_TASK",
    label: "Archived Task",
    description: "Status for tasks that have been archived",
    group: "lifecycle",
    sort_order: 2 as number & tags.Type<"int32">,
    is_default: false,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const pendingStatusBody = {
    code: "PENDING_REVIEW",
    label: "Pending Review",
    description: "Status for tasks waiting for review",
    group: "workflow",
    sort_order: 3 as number & tags.Type<"int32">,
    is_default: false,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const activeStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: activeStatusBody,
    });
  typia.assert(activeStatus);

  const archivedStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: archivedStatusBody,
    });
  typia.assert(archivedStatus);

  const pendingStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: pendingStatusBody,
    });
  typia.assert(pendingStatus);

  // Helper to extract codes from summary list
  const extractCodes = (page: IPageITodoAppTodoStatus.ISummary): string[] =>
    page.data.map((s) => s.code);

  // 3. Query for "Active" to match only ACTIVE_TASK.
  const activeQueryBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    query: "Active",
    isActiveOnly: true,
    sortKey: "code" as const,
    sortDirection: "asc" as const,
  } satisfies ITodoAppTodoStatus.IRequest;

  const activeQueryResult: IPageITodoAppTodoStatus.ISummary =
    await api.functional.todoApp.todoStatuses.index(connection, {
      body: activeQueryBody,
    });
  typia.assert(activeQueryResult);

  const activeCodes = extractCodes(activeQueryResult);
  TestValidator.predicate(
    "Active query result contains ACTIVE_TASK",
    activeCodes.includes("ACTIVE_TASK"),
  );
  TestValidator.predicate(
    "Active query result does not contain ARCHIVED_TASK",
    !activeCodes.includes("ARCHIVED_TASK"),
  );
  TestValidator.predicate(
    "Active query result does not contain PENDING_REVIEW",
    !activeCodes.includes("PENDING_REVIEW"),
  );

  // 4. Query for "Archived" to match only ARCHIVED_TASK.
  const archivedQueryBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    query: "Archived",
    isActiveOnly: true,
    sortKey: "code" as const,
    sortDirection: "asc" as const,
  } satisfies ITodoAppTodoStatus.IRequest;

  const archivedQueryResult: IPageITodoAppTodoStatus.ISummary =
    await api.functional.todoApp.todoStatuses.index(connection, {
      body: archivedQueryBody,
    });
  typia.assert(archivedQueryResult);

  const archivedCodes = extractCodes(archivedQueryResult);
  TestValidator.predicate(
    "Archived query result contains ARCHIVED_TASK",
    archivedCodes.includes("ARCHIVED_TASK"),
  );
  TestValidator.predicate(
    "Archived query result does not contain ACTIVE_TASK",
    !archivedCodes.includes("ACTIVE_TASK"),
  );
  TestValidator.predicate(
    "Archived query result does not contain PENDING_REVIEW",
    !archivedCodes.includes("PENDING_REVIEW"),
  );

  // 5. Query for "Pending" to match only PENDING_REVIEW.
  const pendingQueryBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    query: "Pending",
    isActiveOnly: true,
    sortKey: "code" as const,
    sortDirection: "asc" as const,
  } satisfies ITodoAppTodoStatus.IRequest;

  const pendingQueryResult: IPageITodoAppTodoStatus.ISummary =
    await api.functional.todoApp.todoStatuses.index(connection, {
      body: pendingQueryBody,
    });
  typia.assert(pendingQueryResult);

  const pendingCodes = extractCodes(pendingQueryResult);
  TestValidator.predicate(
    "Pending query result contains PENDING_REVIEW",
    pendingCodes.includes("PENDING_REVIEW"),
  );
  TestValidator.predicate(
    "Pending query result does not contain ACTIVE_TASK",
    !pendingCodes.includes("ACTIVE_TASK"),
  );
  TestValidator.predicate(
    "Pending query result does not contain ARCHIVED_TASK",
    !pendingCodes.includes("ARCHIVED_TASK"),
  );

  // 6. Query without text filter (no `query` at all) should return at
  //    least the three created statuses when pagination allows.
  const unfilteredBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    isActiveOnly: true,
    sortKey: "code" as const,
    sortDirection: "asc" as const,
  } satisfies ITodoAppTodoStatus.IRequest;

  const unfilteredResult: IPageITodoAppTodoStatus.ISummary =
    await api.functional.todoApp.todoStatuses.index(connection, {
      body: unfilteredBody,
    });
  typia.assert(unfilteredResult);

  const unfilteredCodes = extractCodes(unfilteredResult);
  TestValidator.predicate(
    "Unfiltered list contains ACTIVE_TASK",
    unfilteredCodes.includes("ACTIVE_TASK"),
  );
  TestValidator.predicate(
    "Unfiltered list contains ARCHIVED_TASK",
    unfilteredCodes.includes("ARCHIVED_TASK"),
  );
  TestValidator.predicate(
    "Unfiltered list contains PENDING_REVIEW",
    unfilteredCodes.includes("PENDING_REVIEW"),
  );
}
