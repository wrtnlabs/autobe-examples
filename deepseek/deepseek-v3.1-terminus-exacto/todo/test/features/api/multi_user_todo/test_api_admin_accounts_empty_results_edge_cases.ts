import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test edge cases and boundary conditions for the admin accounts search endpoint.
 * Verify behavior when no records match search criteria, when using extreme date
 * ranges, and when searching with empty or invalid parameters. Test pagination
 * edge cases such as requesting pages beyond the available data range and using
 * minimum/maximum limit values. Validate that the system handles these scenarios
 * gracefully and returns appropriate empty results with correct pagination metadata.
 */
export async function test_api_admin_accounts_empty_results_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection for authorization
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, { body: {} });
  // 2. Test default empty search - should return at least current admin
  const emptySearch = await api.functional.multiUserTodo.admins.index(
    adminConnection,
    {
      body: {} satisfies IMultiUserTodoAdmin.IRequest,
    },
  );
  typia.assert(emptySearch);
  TestValidator.predicate(
    "empty search returns at least current admin",
    emptySearch.data.length >= 1,
  );
  TestValidator.equals(
    "pagination metadata valid for empty search",
    emptySearch.pagination.current,
    1,
  );
  TestValidator.predicate(
    "records count matches data length",
    emptySearch.pagination.records >= emptySearch.data.length,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    emptySearch.pagination.pages >= 1,
  );
  // 3. Test non-matching search term - should return empty results
  const impossibleSearch = await api.functional.multiUserTodo.admins.index(
    adminConnection,
    {
      body: {
        search: typia.random<string & tags.Format<"uuid">>(), // UUID unlikely to match email/display name
      } satisfies IMultiUserTodoAdmin.IRequest,
    },
  );
  typia.assert(impossibleSearch);
  TestValidator.equals(
    "impossible search returns empty data array",
    impossibleSearch.data.length,
    0,
  );
  TestValidator.equals(
    "records count is 0 for impossible search",
    impossibleSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages count is 0 for impossible search",
    impossibleSearch.pagination.pages,
    0,
  );
  TestValidator.equals(
    "current page is 1 for impossible search",
    impossibleSearch.pagination.current,
    1,
  );
  // 4. Test future date range - no records should exist
  const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365); // 1 year future
  const futureSearch = await api.functional.multiUserTodo.admins.index(
    adminConnection,
    {
      body: {
        created_at_start: futureDate.toISOString(),
      } satisfies IMultiUserTodoAdmin.IRequest,
    },
  );
  typia.assert(futureSearch);
  TestValidator.equals(
    "future date range returns empty results",
    futureSearch.data.length,
    0,
  );
  // 5. Test pagination edge case: page beyond available data
  const pageBeyond = await api.functional.multiUserTodo.admins.index(
    adminConnection,
    {
      body: {
        page: 100,
        limit: 1,
      } satisfies IMultiUserTodoAdmin.IRequest,
    },
  );
  typia.assert(pageBeyond);
  TestValidator.equals(
    "page beyond data returns empty results",
    pageBeyond.data.length,
    0,
  );
  TestValidator.equals(
    "current page is requested page",
    pageBeyond.pagination.current,
    100,
  );
  // 6. Test minimum and maximum limit values
  const minLimit = await api.functional.multiUserTodo.admins.index(
    adminConnection,
    {
      body: {
        limit: 1,
      } satisfies IMultiUserTodoAdmin.IRequest,
    },
  );
  typia.assert(minLimit);
  TestValidator.equals(
    "minimum limit value accepted",
    minLimit.pagination.limit,
    1,
  );
  const maxLimit = await api.functional.multiUserTodo.admins.index(
    adminConnection,
    {
      body: {
        limit: 100,
      } satisfies IMultiUserTodoAdmin.IRequest,
    },
  );
  typia.assert(maxLimit);
  TestValidator.equals(
    "maximum limit value accepted",
    maxLimit.pagination.limit,
    100,
  );
  // 7. Test include_deleted when no deleted accounts exist
  const withDeleted = await api.functional.multiUserTodo.admins.index(
    adminConnection,
    {
      body: {
        include_deleted: true,
      } satisfies IMultiUserTodoAdmin.IRequest,
    },
  );
  typia.assert(withDeleted);
  // Should at least include the current admin (not deleted)
  TestValidator.predicate(
    "include_deleted includes non-deleted admins",
    withDeleted.data.length >= 1,
  );
  // 8. Test combination of impossible filters
  const combinedImpossible = await api.functional.multiUserTodo.admins.index(
    adminConnection,
    {
      body: {
        search: "NONEXISTENT12345",
        created_at_start: new Date(
          Date.now() + 1000 * 60 * 60 * 24,
        ).toISOString(), // tomorrow
        created_at_end: new Date(
          Date.now() + 1000 * 60 * 60 * 24 * 2,
        ).toISOString(), // day after tomorrow
        updated_at_start: new Date(
          Date.now() - 1000 * 60 * 60 * 24 * 365 * 10,
        ).toISOString(), // 10 years ago
        updated_at_end: new Date(
          Date.now() - 1000 * 60 * 60 * 24 * 365 * 9,
        ).toISOString(), // 9 years ago
      } satisfies IMultiUserTodoAdmin.IRequest,
    },
  );
  typia.assert(combinedImpossible);
  TestValidator.equals(
    "combined impossible filters returns empty results",
    combinedImpossible.data.length,
    0,
  );
  // 9. Test that all empty result sets have consistent pagination metadata
  const emptyResults = [
    impossibleSearch,
    futureSearch,
    pageBeyond,
    combinedImpossible,
  ];
  for (const [index, result] of emptyResults.entries()) {
    if (result.pagination.records === 0) {
      TestValidator.equals(
        `empty result ${index}: pages is 0 when records is 0`,
        result.pagination.pages,
        0,
      );
      TestValidator.equals(
        `empty result ${index}: data array is empty`,
        result.data.length,
        0,
      );
    }
  }
}
