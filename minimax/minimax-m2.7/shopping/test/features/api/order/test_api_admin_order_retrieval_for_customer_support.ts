import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCheckoutConfirm } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutConfirm";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
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
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";

/**
 * Test that an administrator can retrieve any customer's order for support scenarios.
 *
 * This test validates the admin bypass of ownership check, allowing administrators
 * to view any customer's order details for customer service and dispute resolution.
 *
 * Prerequisites: Customer has an existing order, admin is authenticated.
 *
 * Steps:
 * 1. Register and authenticate as customer
 * 2. Create cart item and confirm checkout to create an order
 * 3. Authenticate as admin
 * 4. Admin retrieves the customer's order using the orderId
 * 5. Validate that admin can access the order (bypasses ownership check)
 * 6. Validate complete order details with nested data
 *
 * Validations:
 * - Response is 200 OK (admin bypasses ownership)
 * - Order belongs to the customer, not the admin
 * - All nested data loaded: shipping_address, order_items with snapshots, shipments
 * - ProductSnapshot captures product state at purchase time
 * - SellerProfileSnapshot captures seller profile at purchase time
 */
export async function test_api_admin_order_retrieval_for_customer_support(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register and authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  const customerId = customerAuth.id;
  // Step 2: Create cart item and checkout to create an order
  // First need to get a valid variant ID - using generation utility
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {},
  );
  // Confirm checkout to create order
  const order =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerConnection,
      {
        body: {
          payment_token: typia.random<string>(),
        } satisfies IEcommerceMallCheckoutConfirm.IRequest,
      },
    );
  typia.assert(order);
  // Extract orderId
  const orderId = order.id;
  // Step 3: Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Step 4: Admin retrieves the customer's order
  const adminOrder = await api.functional.ecommerceMall.customer.orders.at(
    adminConnection,
    { orderId },
  );
  typia.assert(adminOrder);
  // Step 5: Validate order belongs to the customer (proving admin bypasses ownership)
  TestValidator.equals(
    "order belongs to customer",
    adminOrder.customer.id,
    customerId,
  );
  // Step 6: Validate complete order details with nested data
  TestValidator.predicate(
    "order has shipping address",
    adminOrder.shipping_address !== null,
  );
  TestValidator.predicate(
    "order has order items",
    adminOrder.order_items.length > 0,
  );
  TestValidator.predicate(
    "order has shipments array",
    Array.isArray(adminOrder.shipments),
  );
  // Validate nested data in order items
  const firstOrderItem = adminOrder.order_items[0];
  TestValidator.predicate(
    "order item has product snapshot",
    firstOrderItem.productSnapshot !== null,
  );
  TestValidator.predicate(
    "order item has seller profile snapshot",
    firstOrderItem.sellerProfileSnapshot !== null,
  );
  // Validate product snapshot captures product state at purchase time
  TestValidator.predicate(
    "product snapshot has name",
    firstOrderItem.productSnapshot.name.length > 0,
  );
  TestValidator.predicate(
    "product snapshot has description",
    firstOrderItem.productSnapshot.description !== null,
  );
  TestValidator.predicate(
    "product snapshot has base price",
    firstOrderItem.productSnapshot.base_price > 0,
  );
  TestValidator.predicate(
    "product snapshot has category name",
    firstOrderItem.productSnapshot.category_name.length > 0,
  );
  // Validate seller profile snapshot captures seller profile at purchase time
  TestValidator.predicate(
    "seller profile snapshot has shop name",
    firstOrderItem.sellerProfileSnapshot.shop_name.length > 0,
  );
}
