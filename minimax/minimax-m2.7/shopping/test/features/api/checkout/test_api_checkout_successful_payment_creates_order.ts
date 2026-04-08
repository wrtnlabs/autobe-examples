import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_mall_customer_customers_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_addresses_create";
import { generate_random_ecommerce_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_cart_items_create";
import { generate_random_ecommerce_mall_customer_payments_checkout } from "../../../generate/generate_random_ecommerce_mall_customer_payments_checkout";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_checkout } from "../../../prepare/prepare_random_ecommerce_mall_checkout";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

export async function test_api_checkout_successful_payment_creates_order(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer connection via join
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Create shipping address for checkout
  const address =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  // 3. Create cart items (product/variant setup handled internally by utility)
  const cart =
    await generate_random_ecommerce_mall_customer_customers_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(cart);
  // 4. Perform checkout with valid address
  const order = await generate_random_ecommerce_mall_customer_payments_checkout(
    customerConnection,
    {
      body: {
        shippingAddressId: address.id,
      } satisfies IEcommerceMallCheckout.ICreate,
    },
  );
  typia.assert(order);
  // 5. Validate order creation
  TestValidator.equals(
    "order has unique order number",
    !!order.orderNumber,
    true,
  );
  TestValidator.equals("order status is paid", order.status, "paid");
  TestValidator.predicate("order has items", order.itemsCount > 0);
  TestValidator.equals("subtotal is positive", order.subtotal > 0, true);
  TestValidator.equals(
    "total amount matches subtotal",
    order.totalAmount,
    order.subtotal,
  );
  TestValidator.equals("shipping cost is zero", order.shippingCost, 0);
  // 6. Validate order items
  TestValidator.predicate("has order items", order.orderItems.length > 0);
  for (const item of order.orderItems) {
    typia.assert(item);
    TestValidator.equals("item status is paid", item.status, "paid");
    TestValidator.equals(
      "item has product snapshot",
      !!item.productSnapshot,
      true,
    );
    TestValidator.equals(
      "item has seller profile snapshot",
      !!item.sellerProfileSnapshot,
      true,
    );
    TestValidator.equals(
      "item has product variant",
      !!item.productVariant,
      true,
    );
    TestValidator.predicate("quantity is positive", item.quantity > 0);
  }
  // 7. Validate shipments array exists (empty for new order)
  TestValidator.equals(
    "shipments array exists",
    Array.isArray(order.shipments),
    true,
  );
  TestValidator.equals(
    "shipments empty for new order",
    order.shipments.length,
    0,
  );
  // 8. Validate shipping address in order
  TestValidator.equals(
    "shipping address included",
    !!order.shippingAddress,
    true,
  );
  TestValidator.equals(
    "address matches input",
    order.shippingAddress.id,
    address.id,
  );
}
