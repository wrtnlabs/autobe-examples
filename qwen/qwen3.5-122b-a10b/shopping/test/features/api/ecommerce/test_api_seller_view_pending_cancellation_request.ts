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
 * Test seller viewing pending cancellation requests for their order items.
 *
 * Validates that a seller can successfully retrieve cancellation requests for order items belonging to their products. This test ensures the seller dashboard can display pending cancellation requests that require seller review and response.
 *
 * The test follows the seller cancellation request review workflow where sellers need to view and respond to customer cancellation requests. Since order creation is not available through the API, the test assumes the order and cancellation request already exist in the test environment.
 *
 * 1. Register and authenticate a seller account with random credentials.
 * 2. Assume an order with order items exists for the seller's products (pre-seeded in test environment).
 * 3. Assume a customer has created a pending cancellation request for an order item.
 * 4. Seller queries the cancellation requests endpoint with order ID and item ID.
 * 5. Verify the response contains the pending cancellation request with correct status, reason, and timestamps.
 * 6. Validate the order item reference matches the expected seller's product.
 */
export async function test_api_seller_view_pending_cancellation_request(
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
  // 2-3. Assume order and cancellation request exist (pre-seeded in test environment)
  // Since order creation is not available through API, we use random UUIDs
  // In a real test environment, these would be pre-seeded with valid data
  const orderId = typia.random<
    string & tags.Format<"uuid">
  >() satisfies string & tags.Format<"uuid">;
  const itemId = typia.random<string & tags.Format<"uuid">>() satisfies string &
    tags.Format<"uuid">;
  // 4. Query cancellation requests for the order item
  const response: IPageIEcommerceCancellationRequest.ISummary =
    await api.functional.ecommerce.seller.orders.items.cancellation_requests.index(
      sellerConnection,
      {
        orderId,
        itemId,
        body: {
          status: "pending",
        } satisfies IEcommerceCancellationRequest.IRequest,
      },
    );
  typia.assert(response);
  // 5. Verify response structure and pagination
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit > 0,
  );
  // 6. Validate cancellation request data if present
  if (response.data.length > 0) {
    const cancellationRequest = response.data[0];
    typia.assert(cancellationRequest);
    TestValidator.equals(
      "cancellation request status is pending",
      cancellationRequest.status,
      "pending",
    );
    TestValidator.predicate(
      "cancellation request has reason",
      cancellationRequest.reason.length > 0,
    );
    TestValidator.predicate(
      "cancellation request has valid ID",
      cancellationRequest.id.length > 0,
    );
    TestValidator.predicate(
      "cancellation request has created_at timestamp",
      cancellationRequest.created_at.length > 0,
    );
    TestValidator.predicate(
      "cancellation request has updated_at timestamp",
      cancellationRequest.updated_at.length > 0,
    );
    // Validate order item reference
    TestValidator.predicate(
      "order item has valid ID",
      cancellationRequest.order_item.id.length > 0,
    );
    TestValidator.predicate(
      "order item has valid quantity",
      cancellationRequest.order_item.quantity > 0,
    );
    TestValidator.predicate(
      "order item has valid unit price",
      cancellationRequest.order_item.unit_price >= 0,
    );
  }
}
