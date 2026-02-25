import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCacheConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCacheConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCacheConfiguration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test cache configuration filtering by priority range with date filtering and pagination.
 * Validates that administrators can search cache configurations using priority ranges
 * and creation date filters, with proper pagination support.
 */
export async function test_api_cache_configuration_priority_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234",
    } satisfies IEcommerceAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Prepare search parameters with priority range and date filtering
  const createdStart = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 1 week ago
  const createdEnd = new Date().toISOString(); // current time
  const searchBody = {
    priority_min: 3,
    priority_max: 8,
    created_at_start: createdStart,
    created_at_end: createdEnd,
    page: 1,
    limit: 20,
  } satisfies IEcommerceCacheConfiguration.IRequest;
  // 3. Execute cache configuration search
  const searchResult =
    await api.functional.ecommerce.administrator.cache_configurations.index(
      adminConnection,
      { body: searchBody },
    );
  typia.assert(searchResult);
  // 4. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", searchResult.pagination.limit, 20);
  TestValidator.predicate(
    "total records non-negative",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages non-negative",
    searchResult.pagination.pages >= 0,
  );
  // 5. Validate page count calculation
  const expectedPages = Math.ceil(searchResult.pagination.records / 20);
  TestValidator.equals(
    "calculated page count",
    searchResult.pagination.pages,
    expectedPages,
  );
  // 6. Validate each returned configuration matches priority range filter
  for (const config of searchResult.data) {
    typia.assert(config);
    TestValidator.predicate(
      `configuration ${config.id} priority within range`,
      config.priority >= 3 && config.priority <= 8,
    );
    // Validate creation date is within filter range (string comparison)
    TestValidator.predicate(
      `configuration ${config.id} created after start date`,
      config.created_at >= createdStart,
    );
    TestValidator.predicate(
      `configuration ${config.id} created before end date`,
      config.created_at <= createdEnd,
    );
  }
  // 7. Validate data count matches pagination metadata
  TestValidator.equals(
    "data count matches pagination limit",
    searchResult.data.length,
    Math.min(20, searchResult.pagination.records),
  );
}
