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
 * Validate filtering of admin todo actions by action_type and reason_category.
 *
 * This E2E test verifies that the admin-only audit log endpoint PATCH
 * /todoApp/adminUser/adminTodoActions correctly applies server-side filters for
 * action_type and reason_category, returning only matching administrative
 * actions and consistent pagination metadata.
 *
 * ## Business context
 *
 * Admin todo actions are stored in the todo_app_admin_todo_actions audit log
 * table and surfaced via ITodoAppAdminTodoAction.ISummary inside a paginated
 * IPageITodoAppAdminTodoAction.ISummary response. Security and compliance
 * reviewers rely on this endpoint to slice the audit trail by high-level action
 * categories (action_type) and justification categories (reason_category) such
 * as policy_violation or legal_request.
 *
 * Because the public SDK does not expose any mutating endpoint that creates
 * admin todo actions, this test treats the audit log as pre-populated (either
 * by fixtures, production data, or typia-based simulation). It focuses
 * exclusively on validating the filtering semantics and response shape, not on
 * data creation.
 *
 * ## Test steps
 *
 * 1. Join an adminUser using POST /auth/adminUser/join to establish an
 *    authenticated admin context. The SDK automatically installs the
 *    Authorization header on the shared connection via the returned
 *    ITodoAppAdminUser.IAuthorized.token.
 * 2. Perform an initial, broadly-scoped search against PATCH
 *    /todoApp/adminUser/adminTodoActions with an
 *    ITodoAppAdminTodoAction.IRequest that only sets basic pagination
 *    (page/pageSize) and a deterministic sort order (e.g., sortBy =
 *    "created_at", sortDirection = "desc"). This call is used to discover real
 *    action_type and reason_category codes present in the system without
 *    assuming any seed data.
 * 3. If the first page contains at least one record, pick the first one and
 *    remember its action_type and reason_category; these become the filter pair
 *    for the main verification request. If the page is empty, skip the
 *    filter-specific assertions but still assert the response shape and
 *    pagination invariants.
 * 4. Issue a second search request where the body satisfies
 *    ITodoAppAdminTodoAction.IRequest and includes:
 *
 *    - Page and pageSize copied from the initial request (or defaulted),
 *    - ActionType set to the selected action_type string, and
 *    - ReasonCategory set to the selected reason_category string,
 *    - SortBy/sortDirection as before. Assert with typia.assert that the response is
 *         a valid IPageITodoAppAdminTodoAction.ISummary.
 * 5. When the filtered response has non-empty data, validate with TestValidator
 *    that:
 *
 *    - Every record.data[i].action_type exactly equals the requested actionType.
 *    - Every record.data[i].reason_category exactly equals the requested
 *         reasonCategory.
 *    - Pagination metadata is internally consistent with the returned data size
 *         (records >= data.length, pages >= 0, etc.).
 * 6. Optionally, craft a third search where actionType stays the same but
 *    reasonCategory is changed to a value that should produce no matches.
 *    Because we do not know the domain taxonomy, we derive a synthetic reason
 *    category that is extremely unlikely to exist by concatenating the
 *    known-good reason_category with a random suffix (e.g.,
 *    `${reasonCategory}__${RandomGenerator.alphaNumeric(16)}`). The request
 *    still satisfies ITodoAppAdminTodoAction.IRequest. Assert that the response
 *    is structurally valid and that data is empty. Confirm via TestValidator
 *    that `data.length === 0` and that pagination metadata is still
 *    non-negative and consistent.
 *
 * The test must be tolerant of both live-backend and simulation modes: it never
 * assumes specific record counts or domain codes, and it treats an initially
 * empty audit log as a valid but degenerate case.
 */
export async function test_api_admin_todo_actions_filtering_by_action_type_and_reason(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin user so that subsequent calls to
  //    the adminTodoActions endpoint are authorized. The join endpoint both
  //    creates the account and installs the access token into
  //    connection.headers.Authorization.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(2),
  } satisfies ITodoAppAdminUser.IJoin;

  const admin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Perform an initial broad search to discover existing action_type and
  //    reason_category values, using stable pagination and ordering.
  const initialRequest = {
    page: 1,
    pageSize: 20,
    sortBy: "created_at",
    sortDirection: "desc",
  } satisfies ITodoAppAdminTodoAction.IRequest;

  const initialPage: IPageITodoAppAdminTodoAction.ISummary =
    await api.functional.todoApp.adminUser.adminTodoActions.index(connection, {
      body: initialRequest,
    });
  typia.assert(initialPage);

  // Basic pagination invariants for the initial response.
  TestValidator.predicate(
    "initial pagination current is non-negative",
    () => initialPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "initial pagination limit is non-negative",
    () => initialPage.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "initial pagination records is at least data length",
    () => initialPage.pagination.records >= initialPage.data.length,
  );
  TestValidator.predicate(
    "initial pagination pages is non-negative",
    () => initialPage.pagination.pages >= 0,
  );

  // If there is no data at all, we cannot meaningfully test filtering by
  // action_type and reason_category, but we still consider the test
  // successful because the API behaved according to its contract.
  if (initialPage.data.length === 0) {
    return;
  }

  const seedAction: ITodoAppAdminTodoAction.ISummary = initialPage.data[0];
  const filterActionType: string = seedAction.action_type;
  const filterReasonCategory: string = seedAction.reason_category;

  // 3. Issue a filtered search constrained by the discovered action_type and
  //    reason_category.
  const filteredRequest = {
    page: initialRequest.page,
    pageSize: initialRequest.pageSize,
    actionType: filterActionType,
    reasonCategory: filterReasonCategory,
    sortBy: initialRequest.sortBy,
    sortDirection: initialRequest.sortDirection,
  } satisfies ITodoAppAdminTodoAction.IRequest;

  const filteredPage: IPageITodoAppAdminTodoAction.ISummary =
    await api.functional.todoApp.adminUser.adminTodoActions.index(connection, {
      body: filteredRequest,
    });
  typia.assert(filteredPage);

  // Validate pagination invariants for the filtered response.
  TestValidator.predicate(
    "filtered pagination current is non-negative",
    () => filteredPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "filtered pagination limit is non-negative",
    () => filteredPage.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "filtered pagination records is at least data length",
    () => filteredPage.pagination.records >= filteredPage.data.length,
  );
  TestValidator.predicate(
    "filtered pagination pages is non-negative",
    () => filteredPage.pagination.pages >= 0,
  );

  // 4. For every record in the filtered data, ensure that the filters were
  //    respected by the backend.
  for (const action of filteredPage.data) {
    TestValidator.equals(
      "filtered action_type matches requested actionType",
      action.action_type,
      filterActionType,
    );
    TestValidator.equals(
      "filtered reason_category matches requested reasonCategory",
      action.reason_category,
      filterReasonCategory,
    );
  }

  // 5. Optional negative case: request a combination that should have no
  //    matches by deriving a synthetic reasonCategory that is extremely
  //    unlikely to exist in the audit log.
  const unlikelyReasonCategory = `${filterReasonCategory}__${RandomGenerator.alphaNumeric(24)}`;

  const negativeRequest = {
    page: initialRequest.page,
    pageSize: initialRequest.pageSize,
    actionType: filterActionType,
    reasonCategory: unlikelyReasonCategory,
    sortBy: initialRequest.sortBy,
    sortDirection: initialRequest.sortDirection,
  } satisfies ITodoAppAdminTodoAction.IRequest;

  const negativePage: IPageITodoAppAdminTodoAction.ISummary =
    await api.functional.todoApp.adminUser.adminTodoActions.index(connection, {
      body: negativeRequest,
    });
  typia.assert(negativePage);

  // Negative response should still have valid pagination metadata.
  TestValidator.predicate(
    "negative pagination current is non-negative",
    () => negativePage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "negative pagination limit is non-negative",
    () => negativePage.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "negative pagination records is at least data length",
    () => negativePage.pagination.records >= negativePage.data.length,
  );
  TestValidator.predicate(
    "negative pagination pages is non-negative",
    () => negativePage.pagination.pages >= 0,
  );

  // The main behavioral expectation is that the data array is empty when we
  // search with an extremely unlikely reasonCategory.
  TestValidator.equals(
    "negative filter should return empty data array",
    negativePage.data.length,
    0,
  );
}
