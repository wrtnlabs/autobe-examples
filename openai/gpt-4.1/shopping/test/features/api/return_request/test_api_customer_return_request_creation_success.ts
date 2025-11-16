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
 * Validate successful creation of a customer-initiated return request.
 *
 * 1. Register and authenticate a new customer using the join API.
 * 2. Simulate preexisting order and order item context as prerequisites, since no
 *    creation or searching APIs for orders/items are available within the scope
 *    of this scenario. Randomly generate valid order and order item UUIDs and
 *    structure as required for test input. (Note: In actual full E2E, this
 *    would require actual order placement and delivery steps, but such
 *    workflows are not available within exposed APIs here.)
 * 3. Customer sends a valid POST /shoppingMall/customer/returnRequests request,
 *    including only the required fields: order_id, order_item_id, and a
 *    free-form reason for return. Omit all optional fields (pickup_address,
 *    scheduled_pickup_at, provider_tracking_code, shipping_partner_id) as per
 *    scenario requirement that these can be omitted at creation.
 * 4. Validate that the API returns an IShoppingMallReturnRequest object with
 *    proper linkage to the provided order and order_item references, reason is
 *    correct, and initial status is set (e.g., 'pending' or as defined by
 *    backend). Ensure that only requestedByCustomer is present and correct,
 *    that requestedBySeller and shippingPartner are null/undefined.
 * 5. Confirm that returned DTO includes required timestamps and correct structure,
 *    and that only the customer actor is associated as the requestor at
 *    creation time.
 */
export async function test_api_customer_return_request_creation_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new customer
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<
      string & tags.MinLength<8> & tags.Format<"password">
    >(),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;

  const customerAuth = await api.functional.auth.customer.join(connection, {
    body: customerJoinBody,
  });
  typia.assert(customerAuth);

  // Prepare actor reference for post-checks
  const customerSummary: IShoppingMallCustomer.ISummary = {
    id: customerAuth.id,
    name: customerAuth.name,
  };

  // 2. Simulate preexisting order and item - generate valid summary stubs
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const orderNumber = RandomGenerator.alphaNumeric(12);
  const skuId = typia.random<string & tags.Format<"uuid">>();
  const orderItemId = typia.random<string & tags.Format<"uuid">>();

  const skuSummary: IShoppingMallProductSku.ISummary = {
    id: skuId,
    code: RandomGenerator.alphaNumeric(10),
    product_title: RandomGenerator.paragraph({ sentences: 3 }),
    option_summary: RandomGenerator.paragraph({ sentences: 2 }),
    in_stock: true,
  };

  const orderSummary: IShoppingMallOrder.ISummary = {
    id: orderId,
    order_number: orderNumber,
    status: "delivered",
    total_amount: 10000,
    currency: "KRW",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const orderItemSummary: IShoppingMallOrderItem.ISummary = {
    id: orderItemId,
    shopping_mall_order_id: orderId,
    sku: skuSummary,
    quantity: 1,
    unit_price: 10000,
    subtotal: 10000,
    currency: "KRW",
    delivered: true,
    refunded: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // 3. Customer sends return request (required fields only)
  const reason = RandomGenerator.paragraph({ sentences: 4 });
  const createReturnBody = {
    order_id: orderId,
    order_item_id: orderItemId,
    reason: reason,
  } satisfies IShoppingMallReturnRequest.ICreate;

  const returnRequest =
    await api.functional.shoppingMall.customer.returnRequests.create(
      connection,
      {
        body: createReturnBody,
      },
    );
  typia.assert(returnRequest);

  // 4. Validate returned structure and linkage
  TestValidator.equals("order linkage", returnRequest.order.id, orderId);
  TestValidator.equals(
    "order item linkage",
    returnRequest.orderItem.id,
    orderItemId,
  );
  TestValidator.equals("return reason", returnRequest.reason, reason);

  // requestedByCustomer - must be present and match authenticated customer
  TestValidator.predicate(
    "requestedByCustomer present and correct",
    !!returnRequest.requestedByCustomer &&
      returnRequest.requestedByCustomer.id === customerSummary.id &&
      returnRequest.requestedByCustomer.name === customerSummary.name,
  );
  // requestedBySeller - must be null or undefined
  TestValidator.equals(
    "requestedBySeller is null/undefined",
    returnRequest.requestedBySeller,
    null,
  );
  // shippingPartner - must be null/undefined
  TestValidator.equals(
    "shippingPartner is null/undefined",
    returnRequest.shippingPartner,
    null,
  );
  // Any optional address/carrier fields - should be null/undefined
  TestValidator.equals(
    "pickup_address is null/undefined",
    returnRequest.pickup_address,
    null,
  );
  TestValidator.equals(
    "scheduled_pickup_at is null/undefined",
    returnRequest.scheduled_pickup_at,
    null,
  );
  TestValidator.equals(
    "provider_tracking_code is null/undefined",
    returnRequest.provider_tracking_code,
    null,
  );
  TestValidator.equals(
    "shippingPartner is null/undefined",
    returnRequest.shippingPartner,
    null,
  );

  // status - must be present with non-empty string value
  TestValidator.predicate(
    "status is non-empty string",
    typeof returnRequest.status === "string" && returnRequest.status.length > 0,
  );
  // created_at and updated_at must be present
  TestValidator.predicate(
    "created_at is present",
    typeof returnRequest.created_at === "string" &&
      returnRequest.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is present",
    typeof returnRequest.updated_at === "string" &&
      returnRequest.updated_at.length > 0,
  );

  // Only customer is the actor - requestedBySeller and shippingPartner must not be present
  TestValidator.equals(
    "only the customer actor present at creation",
    returnRequest.requestedBySeller,
    null,
  );
}
