import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCatalogStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogStatistics";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate product status summary behavior for an empty catalog.
 *
 * Business goals:
 *
 * - Ensure platform admin can retrieve catalog product-status statistics even
 *   when there are no products at all.
 * - Confirm the API contract is stable and well-typed when the underlying product
 *   table is empty (or effectively empty / all non-countable).
 * - Validate that the summary is structurally valid and semantically consistent
 *   for the "no products" case.
 *
 * Workflow:
 *
 * 1. Register a new platform admin using POST /auth/platformAdmin/join.
 *
 *    - Use a realistic IShoppingMallPlatformAdminJoin.IRequest payload with valid
 *         email, name, password, href, and referrer.
 *    - Rely on the SDK behavior that sets the Authorization header on the provided
 *         connection using the returned token.access.
 * 2. Assume the test database/catalog is initially empty for products.
 *
 *    - We do not create any products in this scenario; we just query statistics
 *         against the empty state.
 * 3. As the authenticated platform admin, call GET
 *    /shoppingMall/platformAdmin/catalog/statistics/productStatusSummary via
 *    api.functional.shoppingMall.platformAdmin.catalog.statistics.productStatusSummary.index.
 * 4. Validate that:
 *
 *    - Response type matches IShoppingMallCatalogStatistics.IProductStatusSummary
 *         using typia.assert.
 *    - TotalCount is a non-negative integer and equals 0 when there are no products.
 *    - Buckets is an array (possibly empty). If non-empty, all bucket.productCount
 *         values are 0 and no negative values exist.
 *    - The sum of bucket.productCount equals totalCount.
 *    - For any bucket present, status is a non-empty string.
 */
export async function test_api_platform_admin_product_status_summary_empty_catalog_behavior(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin (join) to obtain an authorized connection.
  const joinRequestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    // optional ip can be omitted or set to null; here we set a realistic IP.
    ip: "127.0.0.1",
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://shoppingmall.local/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequestBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. With the admin now authenticated on the connection, call the
  //    productStatusSummary statistics endpoint.
  const summary: IShoppingMallCatalogStatistics.IProductStatusSummary =
    await api.functional.shoppingMall.platformAdmin.catalog.statistics.productStatusSummary.index(
      connection,
    );

  // Basic type and structure validation.
  typia.assert<IShoppingMallCatalogStatistics.IProductStatusSummary>(summary);

  // 3. Structural assertions: buckets is an array and totalCount is non-negative.
  TestValidator.predicate(
    "totalCount must be non-negative",
    summary.totalCount >= 0,
  );

  TestValidator.equals(
    "buckets must be an array instance",
    Array.isArray(summary.buckets),
    true,
  );

  // 4. Business semantics for an empty or effectively empty catalog.
  // We expect that in an empty catalog, totalCount should be 0 and there should
  // be no bucket with a positive productCount. We don't strictly require
  // buckets to be empty, but enforce consistency: sum of productCount equals
  // totalCount and each productCount is non-negative.

  // Compute sum of bucket.productCount.
  const bucketTotal: number = summary.buckets.reduce(
    (acc, bucket) => acc + bucket.productCount,
    0,
  );

  TestValidator.equals(
    "sum of bucket.productCount must equal totalCount",
    bucketTotal,
    summary.totalCount,
  );

  // All productCount values must be non-negative.
  TestValidator.predicate(
    "all bucket.productCount values must be non-negative",
    summary.buckets.every((bucket) => bucket.productCount >= 0),
  );

  // If the catalog is truly empty, we expect totalCount to be 0 and no bucket
  // with positive productCount. Even if the implementation returns buckets with
  // zero counts for all statuses, this still holds.
  if (summary.totalCount === 0) {
    TestValidator.predicate(
      "no bucket should have positive productCount when totalCount is 0",
      summary.buckets.every((bucket) => bucket.productCount === 0),
    );
  }

  // 5. For any bucket present, validate simple invariants: status is non-empty
  //    string.
  for (const bucket of summary.buckets) {
    TestValidator.predicate(
      "bucket.status must be a non-empty string",
      typeof bucket.status === "string" && bucket.status.length > 0,
    );
  }
}
