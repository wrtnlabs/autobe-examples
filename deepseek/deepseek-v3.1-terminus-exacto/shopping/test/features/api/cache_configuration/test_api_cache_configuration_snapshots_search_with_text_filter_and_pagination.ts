import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCacheConfigurationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationSnapshot";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCacheConfigurationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCacheConfigurationSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_cache_configuration_snapshots_search_with_text_filter_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Generate a configuration ID for testing
  const configId = typia.random<string & tags.Format<"uuid">>();
  // Test 1: Search with text filter containing specific keywords
  const searchKeywords = ["security", "performance", "maintenance", "update"];
  // Execute search with text filter
  const searchResults1 =
    await api.functional.ecommerce.administrator.cache_configurations.snapshots.index(
      adminConnection,
      {
        configId,
        body: {
          suspension_reason_search: "security",
          page: 1,
          limit: 10,
        } satisfies IEcommerceCacheConfigurationSnapshot.IRequest,
      },
    );
  typia.assert(searchResults1);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    searchResults1.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", searchResults1.pagination.limit, 10);
  TestValidator.predicate(
    "records count non-negative",
    searchResults1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count non-negative",
    searchResults1.pagination.pages >= 0,
  );
  // Test 2: Search with different keyword
  const searchResults2 =
    await api.functional.ecommerce.administrator.cache_configurations.snapshots.index(
      adminConnection,
      {
        configId,
        body: {
          suspension_reason_search: "performance",
          page: 1,
          limit: 5,
        } satisfies IEcommerceCacheConfigurationSnapshot.IRequest,
      },
    );
  typia.assert(searchResults2);
  // Validate smaller page size
  TestValidator.equals(
    "smaller pagination limit",
    searchResults2.pagination.limit,
    5,
  );
  // Test 3: Search with combined text filter and date range
  const searchResults3 =
    await api.functional.ecommerce.administrator.cache_configurations.snapshots.index(
      adminConnection,
      {
        configId,
        body: {
          suspension_reason_search: "maintenance",
          suspension_start_date_min: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          suspension_end_date_max: new Date().toISOString(),
          page: 2,
          limit: 15,
        } satisfies IEcommerceCacheConfigurationSnapshot.IRequest,
      },
    );
  typia.assert(searchResults3);
  // Test 4: Search with multiple conditions including email filters
  const searchResults4 =
    await api.functional.ecommerce.administrator.cache_configurations.snapshots.index(
      adminConnection,
      {
        configId,
        body: {
          suspension_reason_search: "update",
          status: "active",
          page: 1,
          limit: 20,
        } satisfies IEcommerceCacheConfigurationSnapshot.IRequest,
      },
    );
  typia.assert(searchResults4);
  // Test 5: Search with partial text matching
  const searchResults5 =
    await api.functional.ecommerce.administrator.cache_configurations.snapshots.index(
      adminConnection,
      {
        configId,
        body: {
          suspension_reason_search: "sec", // partial match
          page: 1,
          limit: 10,
        } satisfies IEcommerceCacheConfigurationSnapshot.IRequest,
      },
    );
  typia.assert(searchResults5);
  // Validate that data array length does not exceed limit
  TestValidator.predicate(
    "data length <= limit",
    searchResults1.data.length <= searchResults1.pagination.limit,
  );
  TestValidator.predicate(
    "data length <= limit for smaller page",
    searchResults2.data.length <= searchResults2.pagination.limit,
  );
  // Test 6: Edge case - empty search results
  const searchResults6 =
    await api.functional.ecommerce.administrator.cache_configurations.snapshots.index(
      adminConnection,
      {
        configId,
        body: {
          suspension_reason_search: "nonexistentkeyword123",
          page: 1,
          limit: 10,
        } satisfies IEcommerceCacheConfigurationSnapshot.IRequest,
      },
    );
  typia.assert(searchResults6);
  // For empty results, records should be 0
  if (searchResults6.pagination.records === 0) {
    TestValidator.equals(
      "empty results data array",
      searchResults6.data.length,
      0,
    );
  }
}
