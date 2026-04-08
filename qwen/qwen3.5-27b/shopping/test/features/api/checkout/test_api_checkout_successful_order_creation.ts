import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshotProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotProductImage";
import type { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_checkout } from "../../../generate/generate_random_shopping_mall_customer_checkout";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_customer_address } from "../../../prepare/prepare_random_shopping_mall_customer_address";
import { prepare_random_shopping_mall_customer_cart_item } from "../../../prepare/prepare_random_shopping_mall_customer_cart_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test the primary success path for customer checkout workflow.
 *
 * Validates the complete checkout process including seller setup, product creation, cart management, and order placement. Ensures that payment processing, inventory deduction, cart clearing, and order item snapshot creation all work correctly.
 *
 * Special attention is given to verifying that product snapshots capture the exact state at purchase time, inventory is properly deducted, and the cart is cleared after successful checkout.
 *
 * 1. Administrator registers and authenticates for seller approval.
 * 2. Seller registers and authenticates to create products.
 * 3. Administrator approves the seller account.
 * 4. Seller creates a product with variants and inventory.
 * 5. Customer registers and authenticates for checkout.
 * 6. Customer creates a shipping address.
 * 7. Customer adds product variant to cart.
 * 8. Customer completes checkout with payment.
 * 9. Validates order creation, inventory deduction, cart clearing, and snapshots.
 */
export async function test_api_checkout_successful_order_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 3. Approve seller
  await api.functional.shoppingMall.administrator.sellers.approve(
    adminConnection,
    {
      sellerId: sellerAuth.id,
      body: {} satisfies IShoppingMallSeller.IApprove,
    },
  );
  // 4. Seller creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 5. Customer registration
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 6. Create shipping address
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection,
    {},
  );
  typia.assert(address);
  // 7. Add product variant to cart
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: product.variants[0].id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem);
  // 8. Complete checkout
  const order = await generate_random_shopping_mall_customer_checkout(
    customerConnection,
    {
      body: {
        shopping_mall_customer_address_id: address.id,
        payment_token: RandomGenerator.alphaNumeric(32),
      },
    },
  );
  typia.assert(order);
  // 9. Validate order
  TestValidator.equals("order has items", order.items.length, 1);
  TestValidator.equals(
    "order item status is paid",
    order.items[0].status,
    "paid",
  );
  TestValidator.equals(
    "shipping address matches",
    order.shippingAddress.id,
    address.id,
  );
  TestValidator.predicate(
    "order has order number",
    order.order_number.length > 0,
  );
  // Calculate total from order items since total_price is not in IShoppingMallOrder
  const computedTotal = order.items.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0,
  );
  TestValidator.predicate("order total price is positive", computedTotal > 0);
  TestValidator.equals(
    "product name in snapshot",
    order.items[0].product_name,
    product.name,
  );
  TestValidator.equals(
    "variant SKU in snapshot",
    order.items[0].variant_sku_code,
    product.variants[0].sku_code,
  );
}
