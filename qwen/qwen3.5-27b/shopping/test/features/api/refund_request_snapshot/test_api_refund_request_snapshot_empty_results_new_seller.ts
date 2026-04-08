import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequestSnapshot";
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that a new seller with no refund request history receives an empty but valid paginated response.
 *
 * Validates that the refund request snapshot endpoint returns a properly structured empty result set for sellers who have never responded to any refund requests. Ensures pagination metadata is accurate (records=0, pages=0) and the response schema is maintained even when no data exists.
 *
 * Special attention is given to verifying that empty results are handled gracefully without errors, and that pagination parameters are correctly reflected in the response metadata.
 *
 * 1. Register and authenticate as a new seller without creating any products or orders.
 * 2. Call refund request snapshots endpoint without filters and verify empty data array.
 * 3. Validate pagination metadata shows current=1, limit=20, records=0, pages=0.
 * 4. Test with custom pagination parameters (page=1, limit=10) and verify updated metadata.
 * 5. Test with non-existent refund_request_id filter and verify empty results.
 */
export async function test_api_refund_request_snapshot_empty_results_new_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a new seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Call refund request snapshots without any filters
  const result1 =
    await api.functional.shoppingMall.seller.refund_requests.snapshots.index(
      sellerConnection,
      {
        body: {} satisfies IShoppingMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(result1);
  // 3. Verify empty data array
  TestValidator.equals("data array is empty", result1.data.length, 0);
  // 4. Verify pagination metadata for default parameters
  TestValidator.equals("current page is 1", result1.pagination.current, 1);
  TestValidator.equals("default limit is 20", result1.pagination.limit, 20);
  TestValidator.equals("records count is 0", result1.pagination.records, 0);
  TestValidator.equals("pages count is 0", result1.pagination.pages, 0);
  // 5. Test with custom pagination parameters (page=1, limit=10)
  const result2 =
    await api.functional.shoppingMall.seller.refund_requests.snapshots.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(result2);
  // 6. Verify empty data with custom pagination
  TestValidator.equals(
    "data array is empty with custom pagination",
    result2.data.length,
    0,
  );
  TestValidator.equals(
    "current page is 1 with custom params",
    result2.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit is 10 with custom params",
    result2.pagination.limit,
    10,
  );
  TestValidator.equals(
    "records count is 0 with custom params",
    result2.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages count is 0 with custom params",
    result2.pagination.pages,
    0,
  );
  // 7. Test with non-existent refund_request_id filter
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  const result3 =
    await api.functional.shoppingMall.seller.refund_requests.snapshots.index(
      sellerConnection,
      {
        body: {
          refund_request_id: nonExistentId,
        } satisfies IShoppingMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(result3);
  // 8. Verify empty results with non-existent filter
  TestValidator.equals(
    "data array is empty with non-existent filter",
    result3.data.length,
    0,
  );
  TestValidator.equals(
    "records count is 0 with filter",
    result3.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages count is 0 with filter",
    result3.pagination.pages,
    0,
  );
}
