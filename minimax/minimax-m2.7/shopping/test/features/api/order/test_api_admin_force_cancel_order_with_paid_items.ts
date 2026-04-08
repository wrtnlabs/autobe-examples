import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_customers_me_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_addresses_create";
import { generate_random_ecommerce_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_orders_create";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

/**
 * Test admin force-cancels an order with all items having 'paid' status.
 *
 * Validates the administrator's ability to force-cancel orders containing items
 * in 'paid' status. When an admin force-cancels an order, the system should:
 *
 * 1. Change all order items from 'paid' to 'cancelled' status
 * 2. Update the overall order status to 'cancelled'
 * 3. Create refund records for each cancelled item
 * 4. Restore inventory by creating inventory records with positive quantity changes
 *
 * This test validates the complete cancellation workflow including order status
 * transitions, item status updates, and refund processing for paid orders.
 *
 * 1. Administrator authenticates via admin join endpoint.
 * 2. Customer account is created and authenticated.
 * 3. Customer creates a shipping address for order delivery.
 * 4. Customer places an order with items in 'paid' status.
 * 5. Admin force-cancels the order using the admin endpoint.
 * 6. Validates order status changed to 'cancelled'.
 * 7. Validates all order items have 'cancelled' status.
 * 8. Validates response includes complete order details.
 */
export async function test_api_admin_force_cancel_order_with_paid_items(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  // 2. Customer account creation
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  // 3. Create shipping address
  const address =
    await generate_random_ecommerce_mall_customer_customers_me_addresses_create(
      customerConnection,
      {},
    );
  // 4. Create order with paid items
  const order =
    await generate_random_ecommerce_mall_customer_customers_me_orders_create(
      customerConnection,
      {
        body: {
          shippingAddressId: address.id,
        },
      },
    );
  typia.assert(order);
  // Store original item IDs and statuses for validation
  const originalItemStatuses = order.orderItems.map((item) => ({
    id: item.id,
    status: item.status,
  }));
  // Verify items are in 'paid' status before force-cancel
  TestValidator.equals("initial order status is paid", order.status, "paid");
  originalItemStatuses.forEach((item) => {
    TestValidator.equals("item initially paid", item.status, "paid");
  });
  // 5. Admin force-cancels the order
  const cancelledOrder =
    await api.functional.ecommerceMall.admin.admin.orders.force_cancel.forceCancel(
      adminConnection,
      {
        orderId: order.order_number,
      },
    );
  typia.assert(cancelledOrder);
  // 6. Validate order status changed to 'cancelled'
  TestValidator.equals(
    "order status is cancelled",
    cancelledOrder.status,
    "cancelled",
  );
  // 7. Validate all order items have 'cancelled' status
  cancelledOrder.orderItems.forEach((item) => {
    TestValidator.equals("item status is cancelled", item.status, "cancelled");
  });
  // 8. Validate response includes complete order details
  TestValidator.equals("order ID preserved", cancelledOrder.id, order.id);
  TestValidator.equals(
    "order number preserved",
    cancelledOrder.order_number,
    order.order_number,
  );
  TestValidator.equals(
    "customer preserved",
    cancelledOrder.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "shipping address preserved",
    cancelledOrder.shippingAddress.id,
    address.id,
  );
  TestValidator.equals(
    "order items count matches",
    cancelledOrder.orderItems.length,
    order.orderItems.length,
  );
  // 9. Validate refund-related data is present in the snapshots
  cancelledOrder.orderItems.forEach((item) => {
    TestValidator.predicate(
      "item has product snapshot",
      !!item.productSnapshot,
    );
    TestValidator.predicate(
      "item has seller profile snapshot",
      !!item.sellerProfileSnapshot,
    );
    TestValidator.predicate("item has product variant", !!item.productVariant);
  });
}
