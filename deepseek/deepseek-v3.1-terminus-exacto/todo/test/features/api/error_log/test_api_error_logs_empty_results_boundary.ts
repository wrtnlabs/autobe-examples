import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import type { IMultiUserTodoErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoErrorLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoErrorLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test boundary conditions and empty result handling for admin error logs API.
 *
 * Tests that the error logs API gracefully handles empty result sets with:
 * 1. Non-matching filters (non-existent error types, future dates, unknown search text)
 * 2. Pagination boundary conditions (page beyond results, min/max limit values)
 * 3. Consistent response structure even with 0 records
 */
export async function test_api_error_logs_empty_results_boundary(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection using join
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IMultiUserTodoAdmin.IJoin,
  });
  // 2. Test with non-existent error_type
  const nonExistentErrorType =
    "non_existent_error_type_" + RandomGenerator.alphabets(8);
  const result1 = await api.functional.multiUserTodo.admin.error_logs.index(
    adminConnection,
    {
      body: {
        error_type: nonExistentErrorType,
      } satisfies IMultiUserTodoErrorLog.IRequest,
    },
  );
  typia.assert(result1);
  TestValidator.equals(
    "empty data array for non-existent error_type",
    result1.data.length,
    0,
  );
  TestValidator.equals("pagination records 0", result1.pagination.records, 0);
  TestValidator.equals("pagination pages 0", result1.pagination.pages, 0);
  TestValidator.equals(
    "current page defaults to 1",
    result1.pagination.current,
    1,
  );
  TestValidator.equals("limit defaults to 20", result1.pagination.limit, 20);
  // 3. Test with future date range (should match no records)
  const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 days in future
  const result2 = await api.functional.multiUserTodo.admin.error_logs.index(
    adminConnection,
    {
      body: {
        occurred_at_from: futureDate.toISOString(),
      } satisfies IMultiUserTodoErrorLog.IRequest,
    },
  );
  typia.assert(result2);
  TestValidator.equals(
    "empty data for future date range",
    result2.data.length,
    0,
  );
  TestValidator.equals(
    "records 0 for future date",
    result2.pagination.records,
    0,
  );
  TestValidator.equals("pages 0 for future date", result2.pagination.pages, 0);
  // 4. Test with unknown search text (random string unlikely to exist)
  const randomSearchText = "xyzabc123!" + RandomGenerator.alphabets(10) + "!";
  const result3 = await api.functional.multiUserTodo.admin.error_logs.index(
    adminConnection,
    {
      body: {
        search: randomSearchText,
      } satisfies IMultiUserTodoErrorLog.IRequest,
    },
  );
  typia.assert(result3);
  TestValidator.equals("empty data for random search", result3.data.length, 0);
  TestValidator.equals(
    "records 0 for random search",
    result3.pagination.records,
    0,
  );
  // 5. Test page beyond available results
  const result4 = await api.functional.multiUserTodo.admin.error_logs.index(
    adminConnection,
    {
      body: {
        page: 1000,
        limit: 1,
      } satisfies IMultiUserTodoErrorLog.IRequest,
    },
  );
  typia.assert(result4);
  TestValidator.equals("empty data for page 1000", result4.data.length, 0);
  TestValidator.equals(
    "current page should be 1000",
    result4.pagination.current,
    1000,
  );
  TestValidator.equals("limit should be 1", result4.pagination.limit, 1);
  TestValidator.equals("records should be 0", result4.pagination.records, 0);
  TestValidator.equals("pages should be 0", result4.pagination.pages, 0);
  // 6. Test minimum limit value (1)
  const result5 = await api.functional.multiUserTodo.admin.error_logs.index(
    adminConnection,
    {
      body: {
        limit: 1,
      } satisfies IMultiUserTodoErrorLog.IRequest,
    },
  );
  typia.assert(result5);
  TestValidator.equals("limit should be 1", result5.pagination.limit, 1);
  // Data may be empty or have some records, but limit should be respected
  // 7. Test maximum limit value (100)
  const result6 = await api.functional.multiUserTodo.admin.error_logs.index(
    adminConnection,
    {
      body: {
        limit: 100,
      } satisfies IMultiUserTodoErrorLog.IRequest,
    },
  );
  typia.assert(result6);
  TestValidator.equals("limit should be 100", result6.pagination.limit, 100);
  // 8. Combine multiple non-matching filters
  const result7 = await api.functional.multiUserTodo.admin.error_logs.index(
    adminConnection,
    {
      body: {
        error_type: "imaginary_error_type",
        severity: "imaginary_severity",
        service_name: "non_existent_service",
        environment: "imaginary_environment",
        occurred_at_from: futureDate.toISOString(),
        search:
          "this_text_does_not_exist_anywhere_" + RandomGenerator.alphabets(20),
      } satisfies IMultiUserTodoErrorLog.IRequest,
    },
  );
  typia.assert(result7);
  TestValidator.equals(
    "empty data for combined filters",
    result7.data.length,
    0,
  );
  TestValidator.equals(
    "records 0 for combined filters",
    result7.pagination.records,
    0,
  );
  TestValidator.predicate("response structure remains valid", () => {
    return (
      result7.pagination.current >= 1 &&
      result7.pagination.limit >= 1 &&
      result7.pagination.limit <= 100 &&
      result7.pagination.records >= 0 &&
      result7.pagination.pages >= 0
    );
  });
}
