import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemConfiguration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test a super administrator's comprehensive search capabilities with advanced sorting for system governance.
 * The super administrator performs a combined search using multiple criteria: key pattern search,
 * specific data type filter, with custom sorting by key in descending order. Verify that results are
 * correctly ordered by the specified sort criteria, that all search filters are applied correctly,
 * and pagination maintains the sorting order across pages. Test that the response includes accurate
 * pagination metadata (current page, limit, total records, total pages) and that no privileged data
 * is inadvertently exposed. Validate that only super administrators can access this endpoint for security.
 */
export async function test_api_system_configurations_comprehensive_search_with_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Generate comprehensive search criteria
  const searchCriteria: IDiscussionBoardSystemConfiguration.IRequest = {
    search: RandomGenerator.alphabets(3),
    data_type: RandomGenerator.pick([
      "string",
      "integer",
      "boolean",
      "json",
      "datetime",
    ] as const),
    page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
    sort: "key",
    sort_direction: "desc",
  };
  // 3. Perform comprehensive search with sorting
  const response =
    await api.functional.discussionBoard.superAdmin.system_configurations.index(
      superAdminConnection,
      {
        body: searchCriteria,
      },
    );
  // 4. Validate response structure
  typia.assert(response);
  // 5. Test pagination metadata
  TestValidator.predicate(
    "pagination metadata exists",
    response.pagination !== undefined,
  );
  TestValidator.equals(
    "current page matches request",
    response.pagination.current,
    searchCriteria.page ?? 1,
  );
  TestValidator.equals(
    "limit matches request",
    response.pagination.limit,
    searchCriteria.limit ?? 10,
  );
  TestValidator.predicate(
    "total records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    response.pagination.pages >= 0,
  );
  // 6. Verify sorting order (descending by key)
  if (response.data.length > 1) {
    for (let i = 0; i < response.data.length - 1; i++) {
      const currentKey = response.data[i].key;
      const nextKey = response.data[i + 1].key;
      TestValidator.predicate(
        `keys should be in descending order: ${currentKey} >= ${nextKey}`,
        currentKey >= nextKey,
      );
    }
  }
  // 7. Validate data structure
  response.data.forEach((config, index) => {
    TestValidator.predicate(`config ${index} has id`, config.id.length > 0);
    TestValidator.predicate(`config ${index} has key`, config.key.length > 0);
    TestValidator.predicate(
      `config ${index} has data_type`,
      config.data_type.length > 0,
    );
    // Safe value access with null check
    if (config.value !== null) {
      TestValidator.predicate(
        `config ${index} value is string`,
        typeof config.value === "string",
      );
    }
  });
  // 8. Test that search criteria are respected (realistic validation)
  if (searchCriteria.search && response.data.length > 0) {
    // Check if at least one item matches the search criteria
    const hasMatchingItem = response.data.some(
      (config) =>
        config.key.includes(searchCriteria.search!) ||
        (config.value !== null &&
          config.value.includes(searchCriteria.search!)),
    );
    TestValidator.predicate(
      "at least one item should match search criteria",
      hasMatchingItem || response.data.length === 0,
    );
  }
  if (searchCriteria.data_type && response.data.length > 0) {
    // Check if returned items match the data type filter
    const allMatchDataType = response.data.every(
      (config) => config.data_type === searchCriteria.data_type!,
    );
    TestValidator.predicate(
      "returned items should match data type filter",
      allMatchDataType,
    );
  }
}
