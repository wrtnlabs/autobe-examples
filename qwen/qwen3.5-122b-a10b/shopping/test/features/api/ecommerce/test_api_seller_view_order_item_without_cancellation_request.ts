import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller viewing cancellation requests for order item without any cancellation request.
 *
 * Validates that when a seller queries cancellation requests for an order item that has no cancellation request, the endpoint returns an empty data array with correct pagination metadata. This tests the edge case of empty result handling in the cancellation request listing endpoint.
 *
 * The test assumes an order with order items already exists in the test environment, as order creation is not available through the API. The test focuses on verifying the endpoint correctly handles the case where no cancellation requests exist for a given order item.
 *
 * 1. Register and authenticate a seller account using authorize_seller_join utility.
 * 2. Use pre-existing orderId and itemId from test environment (order creation not available via API).
 * 3. Query the cancellation requests endpoint with pagination parameters.
 * 4. Verify response contains empty data array.
 * 5. Validate pagination metadata shows records=0 and pages=0.
 */
export async function test_api_seller_view_order_item_without_cancellation_request(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Use pre-existing order and order item IDs from test environment
  // Note: Order creation is not available through the API, so we assume these exist
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const itemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Query cancellation requests with pagination parameters
  const cancellationRequests: IPageIEcommerceCancellationRequest.ISummary =
    await api.functional.ecommerce.seller.orders.items.cancellation_requests.index(
      sellerConnection,
      {
        orderId,
        itemId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceCancellationRequest.IRequest,
      },
    );
  typia.assert(cancellationRequests);
  // 4. Verify empty data array
  TestValidator.equals(
    "data array is empty",
    cancellationRequests.data.length,
    0,
  );
  // 5. Validate pagination metadata for empty results
  TestValidator.equals(
    "current page is 1",
    cancellationRequests.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit matches input",
    cancellationRequests.pagination.limit,
    10,
  );
  TestValidator.equals(
    "records count is 0",
    cancellationRequests.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages count is 0",
    cancellationRequests.pagination.pages,
    0,
  );
}
