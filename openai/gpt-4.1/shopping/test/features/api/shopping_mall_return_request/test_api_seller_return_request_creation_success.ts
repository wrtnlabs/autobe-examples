import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallReturnRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReturnRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShippingPartner } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingPartner";

/**
 * Test that a seller can successfully create a seller-initiated return request
 * via the /shoppingMall/seller/returnRequests endpoint with required fields
 * only.
 *
 * Steps:
 *
 * 1. Register a new seller via api.functional.auth.seller.join.
 * 2. Simulate a scenario with a dummy/linked order and order item (using random
 *    values as there is no creation flow available).
 * 3. Submit a return request as the seller with valid order linkage, reason, and
 *    omitting all optional fields.
 * 4. Confirm the return request is created with a "pending" status and attribution
 *    is set to the seller only.
 * 5. Ensure required fields are present and optional fields are null or omitted.
 */
export async function test_api_seller_return_request_creation_success(
  connection: api.IConnection,
) {
  // 1. Register a new seller
  const sellerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    business_name: RandomGenerator.name(),
    registration_number: RandomGenerator.alphaNumeric(10),
    business_phone: RandomGenerator.mobile(),
    href: "https://example.com/onboard",
    referrer: "https://example.com/landing",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallSeller.ICreate;

  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerCreateBody,
  });
  typia.assert(sellerAuth);
  TestValidator.equals(
    "seller attribution matches summary",
    sellerAuth.seller?.business_name,
    sellerCreateBody.business_name,
  );

  // 2. Create simulated order and order item
  const order: IShoppingMallOrder.ISummary =
    typia.random<IShoppingMallOrder.ISummary>();
  const orderItem: IShoppingMallOrderItem.ISummary = {
    ...typia.random<IShoppingMallOrderItem.ISummary>(),
    shopping_mall_order_id: order.id,
  };

  // 3. Submit the return request as seller
  const body = {
    order_id: order.id,
    order_item_id: orderItem.id,
    reason: RandomGenerator.paragraph({ sentences: 2 }),
    // Omit all optionals for minimal test
  } satisfies IShoppingMallReturnRequest.ICreate;

  const result = await api.functional.shoppingMall.seller.returnRequests.create(
    connection,
    { body },
  );
  typia.assert(result);

  // 4. Validate required workflow and attribution
  TestValidator.equals(
    "return request status is pending",
    result.status,
    "pending",
  );
  TestValidator.equals(
    "associated seller as requestor",
    result.requestedBySeller?.business_name,
    sellerCreateBody.business_name,
  );
  TestValidator.equals(
    "associated customer as requestor is null",
    result.requestedByCustomer,
    null,
  );
  TestValidator.equals("order id matches", result.order.id, order.id);
  TestValidator.equals(
    "order item id matches",
    result.orderItem.id,
    orderItem.id,
  );
  TestValidator.equals("reason matches", result.reason, body.reason);
  // 5. Ensure optionals are unset/null
  TestValidator.equals(
    "pickup_address is null or undefined",
    result.pickup_address ?? null,
    null,
  );
  TestValidator.equals(
    "scheduled_pickup_at is null or undefined",
    result.scheduled_pickup_at ?? null,
    null,
  );
  TestValidator.equals(
    "provider_tracking_code is null or undefined",
    result.provider_tracking_code ?? null,
    null,
  );
  TestValidator.equals(
    "shippingPartner is null or undefined",
    result.shippingPartner ?? null,
    null,
  );
}
