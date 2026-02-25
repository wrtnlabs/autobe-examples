import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSystemCacheTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSystemCacheTracking";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSystemCacheTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemCacheTracking";
import type { IShoppingMallSystemReferenceData } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemReferenceData";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator cache invalidation tracking with table name and date range filtering.
 * This test verifies that the cache tracking API correctly filters records by table name and date range.
 */
export async function test_api_admin_cache_tracking_table_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and register
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: `admin_${RandomGenerator.alphabets(6)}@test.com`,
      password: "123456789",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Filter cache tracking records by table name and date range
  // Using the known table name 'shopping_mall_products' as specified in the scenario
  const cacheTrackingFilter: IShoppingMallSystemCacheTracking.IRequest = {
    table_name: "shopping_mall_products",
    created_at_from: "2024-01-01T00:00:00Z",
    created_at_to: "2024-12-31T23:59:59Z",
    page: 1,
    limit: 50,
  };
  const cacheTrackingResponse: IPageIShoppingMallSystemCacheTracking.ISummary =
    await api.functional.shoppingMall.admin.cache_trackings.index(
      adminConnection,
      {
        body: cacheTrackingFilter,
      },
    );
  typia.assert(cacheTrackingResponse);
  // Validate response structure
  TestValidator.predicate(
    "has pagination",
    cacheTrackingResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "has data array",
    Array.isArray(cacheTrackingResponse.data),
  );
  // Validate that all returned records match the filter criteria
  for (const record of cacheTrackingResponse.data) {
    TestValidator.equals(
      "table name matches",
      record.table_name.value,
      "shopping_mall_products",
    );
    // Validate date range (records should be within 2024)
    const invalidatedAt = new Date(record.invalidated_at);
    const fromDate = new Date("2024-01-01T00:00:00Z");
    const toDate = new Date("2024-12-31T23:59:59Z");
    TestValidator.predicate(
      "invalidated within date range",
      invalidatedAt >= fromDate && invalidatedAt <= toDate,
    );
  }
  // Test with non-existent table name to verify filtering works correctly
  const emptyFilter: IShoppingMallSystemCacheTracking.IRequest = {
    table_name: "non_existent_table",
    created_at_from: "2024-01-01T00:00:00Z",
    created_at_to: "2024-12-31T23:59:59Z",
  };
  const emptyResponse: IPageIShoppingMallSystemCacheTracking.ISummary =
    await api.functional.shoppingMall.admin.cache_trackings.index(
      adminConnection,
      {
        body: emptyFilter,
      },
    );
  typia.assert(emptyResponse);
  TestValidator.equals(
    "no records for non-existent table",
    emptyResponse.data.length,
    0,
  );
}
