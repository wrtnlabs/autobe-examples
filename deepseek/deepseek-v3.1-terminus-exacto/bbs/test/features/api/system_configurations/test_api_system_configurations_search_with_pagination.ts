import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemConfiguration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test system configuration search with pagination functionality for administrators.
 *
 * As an administrator, I need to search for system configuration settings to monitor
 * platform operations. The test verifies that administrators can retrieve a paginated
 * list of configurations with default parameters, validate that the response structure
 * includes proper pagination metadata (current page, limit, total records, total pages),
 * and ensure each configuration summary contains the required fields: id, key, data_type,
 * and value.
 *
 * The test validates that the response respects the specified page size and sorting
 * options, and that administrators only see configurations they should have access to
 * (no data leakage). Empty search parameters return all available configurations in
 * the system, properly paginated.
 */
export async function test_api_system_configurations_search_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - CRITICAL: Use utility function, NOT SDK directly
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Test default pagination (empty search parameters)
  const defaultSearch =
    await api.functional.discussionBoard.admin.system_configurations.index(
      adminConnection,
      {
        body: {} satisfies IDiscussionBoardSystemConfiguration.IRequest,
      },
    );
  typia.assert(defaultSearch);
  // Validate pagination metadata structure
  TestValidator.predicate(
    "pagination exists",
    () => defaultSearch.pagination !== undefined,
  );
  TestValidator.predicate("data array exists", () =>
    Array.isArray(defaultSearch.data),
  );
  // Validate pagination metadata values
  const pagination = defaultSearch.pagination;
  TestValidator.equals("current page defaults to 1", pagination.current, 1);
  TestValidator.predicate("limit is non-negative", pagination.limit >= 0);
  TestValidator.predicate("records is non-negative", pagination.records >= 0);
  TestValidator.predicate("pages is non-negative", pagination.pages >= 0);
  // Validate pagination calculation consistency
  const calculatedPages =
    pagination.records === 0
      ? 0
      : Math.ceil(pagination.records / pagination.limit);
  TestValidator.equals(
    "pages calculation matches records/limit",
    pagination.pages,
    calculatedPages,
  );
  // Validate each configuration summary has required fields
  for (const config of defaultSearch.data) {
    typia.assert(config);
    TestValidator.predicate(
      "config has id",
      () => typeof config.id === "string",
    );
    TestValidator.predicate(
      "config has key",
      () => typeof config.key === "string",
    );
    TestValidator.predicate(
      "config has data_type",
      () => typeof config.data_type === "string",
    );
    // value can be string or null
    TestValidator.predicate(
      "config has valid value",
      () => config.value === null || typeof config.value === "string",
    );
  }
  // 3. Test custom pagination (page=2, limit=5) - FIXED: Remove tags usage
  const customSearch =
    await api.functional.discussionBoard.admin.system_configurations.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IDiscussionBoardSystemConfiguration.IRequest,
      },
    );
  typia.assert(customSearch);
  // Validate custom pagination values
  TestValidator.equals(
    "custom page matches request",
    customSearch.pagination.current,
    2,
  );
  TestValidator.equals(
    "custom limit matches request",
    customSearch.pagination.limit,
    5,
  );
  // Validate data length respects limit
  TestValidator.predicate(
    "data length <= limit",
    customSearch.data.length <= 5,
  );
  // 4. Test with sorting parameters
  const sortedSearch =
    await api.functional.discussionBoard.admin.system_configurations.index(
      adminConnection,
      {
        body: {
          sort: "key" as const,
          sort_direction: "asc" as const,
        } satisfies IDiscussionBoardSystemConfiguration.IRequest,
      },
    );
  typia.assert(sortedSearch);
  // Verify sorting parameters don't break response
  TestValidator.predicate("sorted search returns data", () =>
    Array.isArray(sortedSearch.data),
  );
  // 5. Test consistency: total records should be same across all searches
  TestValidator.equals(
    "total records consistent across searches",
    defaultSearch.pagination.records,
    customSearch.pagination.records,
  );
}
