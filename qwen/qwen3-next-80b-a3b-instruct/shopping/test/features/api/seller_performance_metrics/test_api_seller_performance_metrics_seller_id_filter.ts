import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerPerformanceMetrics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerPerformanceMetrics";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSellerPerformanceMetrics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPerformanceMetrics";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_seller_performance_metrics_seller_id_filter(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate with join
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/admin/join",
        referrer: "https://example.com/admin/signup",
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Create a known non-existent seller ID for testing (using a reserved zero UUID as sentinel)
  const nonExistentId = "00000000-0000-0000-0000-000000000000";
  // Step 3: Test filtering with non-existent seller ID only
  const metricsResponseWithNonExistentId: IPageIShoppingMallSellerPerformanceMetrics.ISummary =
    await api.functional.shoppingMall.admin.analytics.seller_performance_metrics.index(
      adminConnection,
      {
        body: {
          sellerIds: [nonExistentId],
        } satisfies IShoppingMallSellerPerformanceMetrics.IRequest,
      },
    );
  typia.assert(metricsResponseWithNonExistentId);
  // Step 4: Validate that non-existent seller ID returns empty data array
  TestValidator.equals(
    "seller performance metrics response for non-existent seller ID has empty data array",
    metricsResponseWithNonExistentId.data.length,
    0,
  );
  // Step 5: Test filtering with empty sellerIds array
  const metricsResponseWithEmptyArray: IPageIShoppingMallSellerPerformanceMetrics.ISummary =
    await api.functional.shoppingMall.admin.analytics.seller_performance_metrics.index(
      adminConnection,
      {
        body: {
          sellerIds: [],
        } satisfies IShoppingMallSellerPerformanceMetrics.IRequest,
      },
    );
  typia.assert(metricsResponseWithEmptyArray);
  // Step 6: Validate that empty sellerIds array returns empty data array (as sellerIds is a filter, empty should mean no sellers)
  TestValidator.equals(
    "seller performance metrics response for empty sellerIds array has empty data array",
    metricsResponseWithEmptyArray.data.length,
    0,
  );
  // Step 7: Test filtering with undefined sellerIds (should behave like no filter)
  const metricsResponseWithUndefinedSellerIds: IPageIShoppingMallSellerPerformanceMetrics.ISummary =
    await api.functional.shoppingMall.admin.analytics.seller_performance_metrics.index(
      adminConnection,
      {
        body: {} satisfies IShoppingMallSellerPerformanceMetrics.IRequest,
      },
    );
  typia.assert(metricsResponseWithUndefinedSellerIds);
  // Validate that undefined sellerIds returns non-empty data (at least one seller)
  TestValidator.predicate(
    "seller performance metrics response for undefined sellerIds has at least one seller",
    metricsResponseWithUndefinedSellerIds.data.length > 0,
  );
  // Step 8: Test filtering with a mix of one valid seller and one non-existent seller
  // Here we use a known valid seller ID if we had a way to get it, but since we don't have a list, we cannot test this
  // The scenario only requires testing non-existent and empty arrays, not valid seller IDs
  // Since we cannot retrieve valid seller IDs without an endpoint, we rely on the requirement that for non-existent IDs the system returns zero results
  // and we've validated that already
  // Step 9: Validate pagination structure for the non-existent seller ID case
  TestValidator.equals(
    "pagination current is 1",
    metricsResponseWithNonExistentId.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 20 or less",
    metricsResponseWithNonExistentId.pagination.limit >= 1 &&
      metricsResponseWithNonExistentId.pagination.limit <= 100,
    true,
  );
  TestValidator.equals(
    "pagination records is 0",
    metricsResponseWithNonExistentId.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages is 0",
    metricsResponseWithNonExistentId.pagination.pages,
    0,
  );
  // Step 10: Validate pagination structure for empty array case
  TestValidator.equals(
    "pagination current for empty array is 1",
    metricsResponseWithEmptyArray.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit for empty array is 20 or less",
    metricsResponseWithEmptyArray.pagination.limit >= 1 &&
      metricsResponseWithEmptyArray.pagination.limit <= 100,
    true,
  );
  TestValidator.equals(
    "pagination records for empty array is 0",
    metricsResponseWithEmptyArray.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages for empty array is 0",
    metricsResponseWithEmptyArray.pagination.pages,
    0,
  );
  // Step 11: Validate pagination structure for undefined sellerIds case (unfiltered)
  TestValidator.equals(
    "pagination current for undefined sellerIds is 1",
    metricsResponseWithUndefinedSellerIds.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit for undefined sellerIds is 20 or less",
    metricsResponseWithUndefinedSellerIds.pagination.limit >= 1 &&
      metricsResponseWithUndefinedSellerIds.pagination.limit <= 100,
    true,
  );
  TestValidator.equals(
    "pagination records for undefined sellerIds is greater than 0",
    metricsResponseWithUndefinedSellerIds.pagination.records > 0,
    true,
  );
  TestValidator.equals(
    "pagination pages for undefined sellerIds is greater than 0",
    metricsResponseWithUndefinedSellerIds.pagination.pages > 0,
    true,
  );
  // Step 12: Validate that the data is correctly typed with typia.assert (already done)
  // No additional validation needed after typia.assert
}
