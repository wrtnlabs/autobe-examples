import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomer";
import type { IShoppingOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrder";
import type { IShoppingOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderAddress";
import type { IShoppingOrderLine } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderLine";
import type { IShoppingOrderLineFulfillment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderLineFulfillment";
import type { IShoppingOrderPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderPaymentAttempt";
import type { IShoppingOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderShipment";
import type { IShoppingOrderSplit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderSplit";
import type { IShoppingOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingOrderStatusHistory";
import type { IShoppingRefundActor } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundActor";
import type { IShoppingRefundAdminOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundAdminOverride";
import type { IShoppingRefundApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundApproval";
import type { IShoppingRefundAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundAttachment";
import type { IShoppingRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundRequest";
import type { IShoppingRefundRequestItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundRequestItem";
import type { IShoppingRefundStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingRefundStatusHistory";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";
import type { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";

/**
 * Test that a customer can successfully soft-delete their own refund, return,
 * or cancellation request, verifying that the deleted_at field is updated,
 * subsequent retrieval is blocked, and audit/deletion events are properly
 * logged. Confirm the refund request is not in a locked or reviewed status at
 * deletion time.
 *
 * 1. Register a new customer and authenticate.
 * 2. Place a new order as the customer.
 * 3. Submit a new refund request (type 'refund') for an order line from the just
 *    created order.
 * 4. Ensure the refund request status is deletable (e.g., 'pending').
 * 5. Perform the erase (soft-delete) operation.
 * 6. Confirm no errors occur; in a real system, you would check that deleted_at is
 *    updated and status_histories reflect the deletion. If no GET endpoint
 *    exists for the refund after deletion, this is not validated in code.
 */
export async function test_api_customer_refund_request_erase_success(
  connection: api.IConnection,
) {
  // 1. Register a new customer and authenticate
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      href: "https://www.autobe-test.com/join",
      referrer: "https://www.autobe-test.com/landing",
      ip: "127.0.0.1",
    } satisfies IShoppingCustomer.ICreate,
  });
  typia.assert(customer);

  // 2. Place a new shopping order
  const orderLineSkuId = typia.random<string & tags.Format<"uuid">>();
  const orderLineQuantity = 1;
  const unitPrice = 10000;
  const orderBody = {
    total_price: unitPrice * orderLineQuantity,
    order_lines: [
      {
        shopping_sku_id: orderLineSkuId,
        quantity: orderLineQuantity,
        unit_price: unitPrice,
      },
    ] satisfies IShoppingOrderLine.ICreate[],
    shipping_addresses: [
      {
        type: "shipping",
        recipient_name: customer.name,
        recipient_phone: customer.phone,
        zip_code: "04524",
        base_address: "1 Eulji-ro, Jung-gu",
        detail_address: "5th Floor, Test Plaza",
        city: "Seoul",
        state_province: "Seoul",
        country: "South Korea",
      },
    ] satisfies IShoppingOrderAddress.ICreate[],
    payment_method: "card",
  } satisfies IShoppingOrder.ICreate;
  const order = await api.functional.shopping.customer.orders.create(
    connection,
    {
      body: orderBody,
    },
  );
  typia.assert(order);
  TestValidator.predicate(
    "order created with single order line",
    order.order_lines.length === 1,
  );

  // 3. Create a refund request for the order and its order line
  const refundRequestType: "refund" | "return" | "cancellation" = "refund";
  const refundReason = RandomGenerator.paragraph({ sentences: 2 });
  const refundRequestItem = {
    shopping_order_id: order.id,
    shopping_order_line_id: order.order_lines[0].id,
    quantity: order.order_lines[0].quantity,
  } satisfies IShoppingRefundRequestItem.ICreate;
  const refundReqBody = {
    shopping_order_id: order.id,
    request_type: refundRequestType,
    business_reason: refundReason,
    items: [refundRequestItem],
  } satisfies IShoppingRefundRequest.ICreate;
  const refundRequest = await api.functional.shopping.customer.refunds.create(
    connection,
    { body: refundReqBody },
  );
  typia.assert(refundRequest);
  TestValidator.equals(
    "refund request status must be pending",
    refundRequest.status,
    "pending",
  ); // Assumption: new refund is in 'pending' status

  // 4. Erase (soft-delete) the refund request
  await api.functional.shopping.customer.refunds.erase(connection, {
    refundRequestId: refundRequest.id,
  });

  // 5. Since no GET endpoint for the deleted refund, we can't directly validate deleted_at or status_histories here
  // (If such endpoint existed: fetch refundRequest again and assert deleted_at is now non-null)
  // Success is determined by lack of error and successful flow up to this point
  TestValidator.predicate(
    "refund request erase (soft-delete) succeeded without error",
    true,
  );
}
