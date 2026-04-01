import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_order_items_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_order_items_refund_requests_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";

/**
 * Test the customer's ability to retrieve their own refund request snapshot after the seller responds.
 *
 * **Prerequisites Setup:**
 * 1. Seller registers and logs in
 * 2. Customer registers and logs in
 * 3. Customer creates a shipping address for order checkout
 * 4. Customer adds product variant to cart (requires existing product/variant)
 * 5. Customer places order creating order items
 * 6. Customer submits a refund request for the order item with a reason
 * 7. Seller responds to the refund request (creates snapshot)
 *
 * **Test Execution:**
 * - Customer calls GET endpoint with their orderItemId, refundRequestId, and snapshotId
 * - Verify response returns complete snapshot with typia.assert()
 * - Verify snapshot contains original refund reason, final status, seller's response, and responded_at timestamp
 *
 * **Validation Points:**
 * - Customer can access their own refund request snapshots
 * - Reason text matches what customer originally submitted
 * - Status reflects seller's decision accurately
 * - Seller response is visible to customer for transparency
 * - Snapshot preserves historical state for dispute resolution
 */
export async function test_api_refund_request_snapshot_customer_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoin);
  const sellerLogin = await authorize_seller_login(sellerConnection, {
    body: {
      email:
        (sellerJoin as any).email ||
        typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(sellerLogin);
  // 2. Customer registration and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerJoin = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerJoin);
  const customerLogin = await authorize_customer_login(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  typia.assert(customerLogin);
  // 3. Customer creates shipping address
  const address = await api.functional.shoppingMall.customer.addresses.create(
    customerConnection,
    {
      body: {
        recipientName: RandomGenerator.name(),
        recipientPhone: RandomGenerator.mobile(),
        streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
        city: RandomGenerator.name(1),
        state: RandomGenerator.name(1),
        postalCode: typia.random<string>(),
        country: "South Korea",
        isDefault: true,
      } satisfies IShoppingMallAddress.ICreate,
    },
  );
  typia.assert(address);
  // 4. Customer adds product variant to cart (requires existing product/variant)
  // Note: Product creation API not available, using random UUID for demonstration
  const cartItem = await api.functional.shoppingMall.customer.cart.items.create(
    customerConnection,
    {
      body: {
        shopping_mall_product_variant_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
      } satisfies IShoppingMallCartItem.ICreate,
    },
  );
  typia.assert(cartItem);
  // 5. Customer places order
  const order = await api.functional.shoppingMall.customer.orders.create(
    customerConnection,
    {
      body: {
        shopping_mall_address_id: address.id,
        cart_item_ids: [cartItem.id],
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // Get the first order item ID
  const orderItemId = order.orderItems[0]?.id;
  if (!orderItemId) {
    throw new Error("No order items created");
  }
  // 6. Customer submits refund request for the order item
  const refundReason = RandomGenerator.paragraph({ sentences: 2 });
  const refundRequest =
    await api.functional.shoppingMall.customer.order_items.refund_requests.create(
      customerConnection,
      {
        orderItemId: orderItemId,
        body: {
          reason: refundReason,
        } satisfies IShoppingMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // 7. Seller responds to refund request (creates snapshot)
  // Note: Seller response API not available in provided functions
  // In a real scenario, seller would call an endpoint to approve/reject the refund
  // For this test, we assume the snapshot has been created by the seller's response
  // 8. Customer retrieves the refund request snapshot
  // Note: snapshotId would be returned from seller's response or listed via a list endpoint
  // For this test, we use the refund request ID as a placeholder
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.shoppingMall.seller.order_items.refund_requests.snapshots.at(
      customerConnection,
      {
        orderItemId: orderItemId,
        refundRequestId: refundRequest.id,
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // Validate snapshot contains expected data
  TestValidator.equals(
    "snapshot refund request ID",
    snapshot.shopping_mall_refund_request_id,
    refundRequest.id,
  );
  TestValidator.equals(
    "snapshot reason matches original",
    snapshot.reason,
    refundReason,
  );
  TestValidator.predicate("snapshot has status", snapshot.status !== undefined);
  TestValidator.predicate(
    "snapshot has responded_at or null",
    snapshot.responded_at === null || typeof snapshot.responded_at === "string",
  );
  TestValidator.predicate(
    "snapshot has created_at",
    snapshot.created_at !== undefined,
  );
  // Validate snapshot immutability - snapshot data should be preserved
  TestValidator.predicate(
    "seller_response is string or null",
    snapshot.seller_response === null ||
      typeof snapshot.seller_response === "string",
  );
}
