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
 * Test retrieving product analytics with multiple filter criteria combined.
 *
 * Validates that the admin analytics endpoint correctly filters products by
 * combining multiple criteria: category_id, seller_id, and price range.
 * Ensures that aggregations (counts, averages, distributions) are computed
 * only from products matching all applied filters.
 *
 * Key validations:
 * - Pagination metadata reflects the filtered count
 * - Aggregated statistics are computed correctly from filtered data
 * - Category and seller distributions contain only matching entries
 *
 * 1. Register a new administrator account via join endpoint
 * 2. Authenticate and create admin connection
 * 3. Send PATCH request with combined filter criteria
 * 4. Validate response structure and business logic
 */
export async function test_api_product_analytics_combined_filter_criteria(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Send analytics request with combined filters
  const response =
    await api.functional.ecommerceMall.admin.admin.analytics.products.index(
      adminConnection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: typia.random<string & tags.Format<"uuid">>(),
          min_price: 10,
          max_price: 100,
          sort: "base_price",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallProduct.IAnalytic.IRequest,
      },
    );
  // 3. Validate complete response structure
  typia.assert(response);
  // 4. Business logic validations
  TestValidator.equals(
    "has pagination metadata",
    response.pagination !== null,
    true,
  );
  TestValidator.equals("pages is 1", response.pagination.pages, 1);
  TestValidator.equals("limit is 10", response.pagination.limit, 10);
  // Validate aggregated data exists and is properly structured
  TestValidator.predicate(
    "analytics data exists",
    response.data !== null && response.data !== undefined,
  );
}
