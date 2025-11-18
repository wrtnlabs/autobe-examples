import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppAdminTodoAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAdminTodoAction";
import type { ITodoAppAdminTodoAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminTodoAction";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Validate that an admin user can search admin todo actions filtered by admin
 * id and time range, and that pagination metadata and filter semantics are
 * consistent.
 *
 * Business flow (limited by available APIs):
 *
 * 1. Join a new admin user via POST /auth/adminUser/join to obtain an authorized
 *    admin context.
 * 2. Define a time window around the current time (from: now - 1 day, to: now + 1
 *    day).
 * 3. Call PATCH /todoApp/adminUser/adminTodoActions with
 *    ITodoAppAdminTodoAction.IRequest body including:
 *
 *    - Page, pageSize
 *    - AdminUserId = joined admin id
 *    - OccurredFrom/occurredTo = defined time window
 *    - SortBy = "created_at", sortDirection = "desc"
 * 4. Assert that the response matches IPageITodoAppAdminTodoAction.ISummary via
 *    typia.assert.
 * 5. Validate pagination invariants (current, limit, records, pages).
 * 6. For each returned admin todo action, when any exist:
 *
 *    - Confirm adminUser.id equals the filter adminUserId
 *    - Confirm created_at is within [occurredFrom, occurredTo]
 *    - Sanity check that results are sorted by created_at desc when there are 2+
 *         records.
 *
 * Note: Because no API for creating admin todo actions is exposed here, the
 * test must be robust to both empty and non-empty result sets. It focuses on
 * the correctness of filtering, pagination, and response structure rather than
 * enforcing the existence of specific audit records.
 */
export async function test_api_admin_todo_actions_search_by_admin_and_todo_lifecycle(
  connection: api.IConnection,
) {
  // 1. Join a new admin user to get an authorized admin context.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppAdminUser.IJoin;

  const authorizedAdmin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(authorizedAdmin);

  const adminUserId: string & tags.Format<"uuid"> = authorizedAdmin.id;

  // 2. Define a time window around now: [now - 1 day, now + 1 day].
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const fromDate = new Date(now.getTime() - oneDayMs);
  const toDate = new Date(now.getTime() + oneDayMs);
  const occurredFrom = fromDate.toISOString();
  const occurredTo = toDate.toISOString();

  // 3. Call the admin todo actions search endpoint with filters and pagination.
  const requestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    adminUserId,
    occurredFrom,
    occurredTo,
    sortBy: "created_at",
    sortDirection: "desc",
  } satisfies ITodoAppAdminTodoAction.IRequest;

  const pageResult: IPageITodoAppAdminTodoAction.ISummary =
    await api.functional.todoApp.adminUser.adminTodoActions.index(connection, {
      body: requestBody,
    });
  typia.assert<IPageITodoAppAdminTodoAction.ISummary>(pageResult);

  const pagination = pageResult.pagination;

  // 4. Validate pagination invariants.
  TestValidator.predicate(
    "pagination.current is non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is non-negative",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is non-negative",
    pagination.pages >= 0,
  );

  // If limit > 0, pages must be ceil(records / limit). If limit === 0, pages must be 0.
  if (pagination.limit > 0) {
    const expectedPages = Math.ceil(pagination.records / pagination.limit);
    TestValidator.equals(
      "pagination.pages matches ceil(records / limit)",
      pagination.pages,
      expectedPages,
    );
  } else {
    TestValidator.equals(
      "when limit is 0, pages must be 0",
      pagination.pages,
      0,
    );
  }

  // 5. If there are no records, we are done after validating pagination structure.
  if (pageResult.data.length === 0) {
    TestValidator.equals(
      "no records when data is empty",
      pageResult.data.length,
      0,
    );
    return;
  }

  // 6. For each returned admin todo action, validate filters and time window.
  const fromMs = new Date(occurredFrom).getTime();
  const toMs = new Date(occurredTo).getTime();

  for (const action of pageResult.data) {
    // adminUser filter enforcement
    TestValidator.equals(
      "adminUser.id matches filter adminUserId",
      action.adminUser.id,
      adminUserId,
    );

    // created_at within time window
    const createdMs = new Date(action.created_at).getTime();
    TestValidator.predicate(
      "created_at is within [occurredFrom, occurredTo]",
      createdMs >= fromMs && createdMs <= toMs,
    );
  }

  // 7. Sanity check sort order by created_at in descending order when multiple records.
  if (pageResult.data.length >= 2) {
    for (let i = 1; i < pageResult.data.length; i += 1) {
      const prevCreated = new Date(pageResult.data[i - 1].created_at).getTime();
      const currCreated = new Date(pageResult.data[i].created_at).getTime();
      TestValidator.predicate(
        "results are sorted by created_at in descending order",
        prevCreated >= currCreated,
      );
    }
  }
}
