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

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_customers_me_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_addresses_create";
import { generate_random_ecommerce_mall_customer_customers_me_cart_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_cart_create";
import { generate_random_ecommerce_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_orders_create";
import { prepare_random_ecommerce_mall_cart } from "../../../prepare/prepare_random_ecommerce_mall_cart";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

/**
 * Test order creation with valid shopping cart and shipping address.
 *
 * Validates the complete order creation flow including customer authentication,
 * shipping address creation, product addition to cart, and final order placement.
 * Ensures that the order correctly references the shipping address and cart items,
 * that computed fields like subtotal and total_amount are accurate, and that
 * product/seller snapshots are created for historical record keeping.
 *
 * 1. Customer registers with valid email and password.
 * 2. Customer creates a shipping address with complete location details.
 * 3. Customer adds a product variant to the shopping cart.
 * 4. Customer places the order with the shipping address.
 * 5. Validates order details, status, order items with snapshots, and totals.
 */
export async function test_api_order_creation_with_valid_cart_and_address(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  typia.assert(authorized);
  // 2. Create shipping address
  const address =
    await generate_random_ecommerce_mall_customer_customers_me_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  // 3. Add product variant to cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_customers_me_cart_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem);
  // 4. Create order with shipping address
  const order =
    await api.functional.ecommerceMall.customer.customers.me.orders.create(
      customerConnection,
      {
        body: {
          shippingAddressId: address.id,
        } satisfies IEcommerceMallOrder.ICreate,
      },
    );
  typia.assert(order);
  // 5. Validate order creation
  TestValidator.equals("order status is paid", order.status, "paid");
  TestValidator.predicate(
    "order number format valid",
    /^ORD-\d{8}-\d{6}$/.test(order.order_number),
  );
  TestValidator.predicate("order has order items", order.orderItems.length > 0);
  TestValidator.equals(
    "shipping address matches",
    order.shippingAddress.id,
    address.id,
  );
  TestValidator.predicate("subtotal is positive", order.subtotal > 0);
  TestValidator.predicate("total amount is positive", order.total_amount > 0);
  TestValidator.equals(
    "total equals subtotal plus shipping",
    order.total_amount,
    order.subtotal + order.shipping_cost,
  );
  // 6. Validate order item with snapshots
  const orderItem = order.orderItems[0];
  TestValidator.equals("order item status is paid", orderItem.status, "paid");
  TestValidator.predicate(
    "product snapshot exists",
    !!orderItem.productSnapshot,
  );
  TestValidator.predicate(
    "product snapshot has name",
    orderItem.productSnapshot.name.length > 0,
  );
  TestValidator.predicate(
    "product snapshot has base price",
    orderItem.productSnapshot.basePrice >= 0,
  );
  TestValidator.predicate(
    "seller profile snapshot exists",
    !!orderItem.sellerProfileSnapshot,
  );
  TestValidator.predicate(
    "seller profile snapshot has shop name",
    orderItem.sellerProfileSnapshot.shopName.length > 0,
  );
}
