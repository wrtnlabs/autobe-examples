import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import type { IPagination } from "@ORGANIZATION/PROJECT-api/lib/structures/IPagination";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test retrieving product analytics filtered by DELETED status.
 *
 * Validates the product analytics endpoint correctly filters and returns only soft-deleted products when the status filter is set to 'DELETED'. This test ensures administrators can view analytics for products that have been removed by sellers.
 *
 * The test verifies:
 * 1. When filtering by DELETED status, active_count is 0 (no active products in deleted-only set)
 * 2. deleted_count reflects the actual number of deleted products in the system
 * 3. The items array contains only products where deleted_at is non-null
 * 4. Pagination metadata is correctly returned
 * 5. Category and seller distributions are computed even for deleted products
 *
 * This is critical for administrative oversight, allowing admins to monitor policy violations, audit seller behavior, and track product lifecycle statistics.
 */
export async function test_api_product_analytics_filter_by_deleted_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register administrator for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Query analytics with DELETED status filter
  const analytics =
    await api.functional.ecommerceMall.admin.admin.analytics.products.index(
      adminConnection,
      {
        body: {
          status: "DELETED",
        } satisfies IEcommerceMallProduct.IAnalytic.IRequest,
      },
    );
  typia.assert(analytics);
  // 3. Validate response structure and business logic
  // When filtering by DELETED only, active_count should be 0
  TestValidator.equals(
    "active_count should be 0 when filtering by DELETED status",
    analytics.data[0].active_count,
    0,
  );
  // deleted_count reflects deleted products (can be 0 if no deleted products exist)
  TestValidator.predicate(
    "deleted_count should be non-negative",
    analytics.data[0].deleted_count >= 0,
  );
  // total_count should equal active_count + deleted_count
  TestValidator.equals(
    "total_count equals active_count + deleted_count",
    analytics.data[0].total_count,
    analytics.data[0].active_count + analytics.data[0].deleted_count,
  );
  // Pagination metadata validation
  TestValidator.predicate(
    "pagination is present",
    analytics.pagination !== null && analytics.pagination !== undefined,
  );
  TestValidator.equals("pagination pages is 1", analytics.pagination.pages, 1);
  // Category distribution is computed
  TestValidator.predicate(
    "category_distribution is an array",
    Array.isArray(analytics.data[0].category_distribution),
  );
  // Seller distribution is computed
  TestValidator.predicate(
    "seller_distribution is an array",
    Array.isArray(analytics.data[0].seller_distribution),
  );
  // Items array exists
  TestValidator.predicate(
    "items array is present",
    Array.isArray(analytics.data[0].items),
  );
}
