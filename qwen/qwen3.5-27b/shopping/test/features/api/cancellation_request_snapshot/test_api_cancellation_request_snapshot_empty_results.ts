import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
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
 * Test that the endpoint returns empty results when no cancellation request snapshots exist for a seller.
 *
 * Validates that when a newly registered seller (who has never responded to any cancellation requests) calls the snapshots endpoint, the API returns a properly structured response with empty data array and correct pagination metadata.
 *
 * This test ensures the API gracefully handles the edge case of empty result sets, returning valid pagination information even when no snapshots exist. The response must include pagination metadata showing zero records and pages, while maintaining the expected response structure.
 *
 * 1. Register and authenticate as a new seller with randomized credentials
 * 2. Call the cancellation request snapshots endpoint without any filters
 * 3. Verify the response data array is empty
 * 4. Verify pagination metadata shows records=0, pages=0, current=1
 * 5. Verify the response structure contains all required fields (pagination and data)
 */
export async function test_api_cancellation_request_snapshot_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a new seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {},
  });
  // 2. Call the snapshots endpoint without any filters
  const output =
    await api.functional.shoppingMall.seller.cancellation_requests.snapshots.index(
      sellerConnection,
      {
        body: {} satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(output);
  // 3. Verify the response data array is empty
  TestValidator.equals("data array is empty", output.data.length, 0);
  // 4. Verify pagination metadata shows records=0, pages=0, current=1
  TestValidator.equals("records is 0", output.pagination.records, 0);
  TestValidator.equals("pages is 0", output.pagination.pages, 0);
  TestValidator.equals("current is 1", output.pagination.current, 1);
  // 5. Verify the response structure contains all required fields
  TestValidator.predicate(
    "pagination has limit field",
    typeof output.pagination.limit === "number",
  );
  TestValidator.predicate("data is an array", Array.isArray(output.data));
}
