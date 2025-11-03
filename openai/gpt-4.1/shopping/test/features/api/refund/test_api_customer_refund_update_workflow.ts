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
 * Test updating a customer refund request and enforcing status-based update
 * rules.
 *
 * This test covers the workflow in which:
 *
 * - A new customer is created and authenticated.
 * - The customer creates a new order with a single order line in order to have a
 *   valid order for refund.
 * - The customer submits a new refund request for their order.
 * - While the refund request is still open (editable status), the customer
 *   updates the business_reason and request_context fields using the refund
 *   update endpoint.
 * - The response is validated to confirm that the updates are reflected and
 *   allowed in the editable state.
 * - The status of the refund request is then set to a finalized/locked value to
 *   simulate non-editable state (e.g., by calling the update endpoint and
 *   setting status to 'approved' or 'completed', depending on what the API
 *   allows).
 * - After status is finalized, the customer attempts to update the refund reason
 *   again and expects a rejection (business rule prohibition on updates after
 *   finalization).
 * - The test specifically checks that the update endpoint allows modification in
 *   open status but blocks further changes when locked.
 * - All entity responses are validated for type safety using typia.assert().
 * - Tests include assertions for business_reason and request_context update
 *   success as well as error handling for rejected update attempts after
 *   finalization.
 */
export async function test_api_customer_refund_update_workflow(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new customer
  const customerCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    href: "https://test.example.com/register",
    referrer: "https://test.example.com/landing",
  } satisfies IShoppingCustomer.ICreate;
  const customerAuth: IShoppingCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerCreate,
    });
  typia.assert(customerAuth);

  // 2. Create a new order for the customer with a single line
  const skuId = typia.random<string & tags.Format<"uuid">>();
  const orderLine = {
    shopping_sku_id: skuId,
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    unit_price: 10000,
  } satisfies IShoppingOrderLine.ICreate;
  const address = {
    type: "shipping",
    recipient_name: customerCreate.name,
    recipient_phone: customerCreate.phone,
    zip_code: "12345",
    base_address: "123 Main St",
    detail_address: null,
    city: "Seoul",
    state_province: "Seoul",
    country: "KR",
  } satisfies IShoppingOrderAddress.ICreate;
  const orderCreate = {
    total_price: 10000,
    order_lines: [orderLine],
    shipping_addresses: [address],
    payment_method: "card",
    coupon_code: null,
  } satisfies IShoppingOrder.ICreate;
  const order: IShoppingOrder =
    await api.functional.shopping.customer.orders.create(connection, {
      body: orderCreate,
    });
  typia.assert(order);

  // 3. Submit a new refund request for the order
  const refundItem = {
    shopping_order_id: order.id,
    shopping_order_line_id: order.order_lines[0].id,
    quantity: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingRefundRequestItem.ICreate;
  const refundCreate = {
    shopping_order_id: order.id,
    request_type: "refund",
    business_reason: "Initial refund reason",
    request_context: "Initial context for refund request.",
    items: [refundItem],
  } satisfies IShoppingRefundRequest.ICreate;
  const refund: IShoppingRefundRequest =
    await api.functional.shopping.customer.refunds.create(connection, {
      body: refundCreate,
    });
  typia.assert(refund);

  // 4. Update refund request while status is open
  const updatedReason = "Updated reason for refund.";
  const updatedContext = "Updated context to provide more details.";
  const updatedRefund: IShoppingRefundRequest =
    await api.functional.shopping.customer.refunds.update(connection, {
      refundRequestId: refund.id,
      body: {
        business_reason: updatedReason,
        request_context: updatedContext,
      } satisfies IShoppingRefundRequest.IUpdate,
    });
  typia.assert(updatedRefund);
  TestValidator.equals(
    "business_reason updated when editable",
    updatedRefund.business_reason,
    updatedReason,
  );
  TestValidator.equals(
    "request_context updated when editable",
    updatedRefund.request_context,
    updatedContext,
  );

  // 5. Finalize refund status (simulate lock/final state)
  const updatedFinal: IShoppingRefundRequest =
    await api.functional.shopping.customer.refunds.update(connection, {
      refundRequestId: refund.id,
      body: {
        status: "approved",
      } satisfies IShoppingRefundRequest.IUpdate,
    });
  typia.assert(updatedFinal);
  TestValidator.equals(
    "refund is finalized/locked",
    updatedFinal.status,
    "approved",
  );

  // 6. Attempt to update after status is finalized/locked (should fail)
  await TestValidator.error(
    "business rule prohibits update of finalized refund",
    async () => {
      await api.functional.shopping.customer.refunds.update(connection, {
        refundRequestId: refund.id,
        body: {
          business_reason: "Attempt to update after locked",
          request_context: "Should not succeed.",
        } satisfies IShoppingRefundRequest.IUpdate,
      });
    },
  );
}
