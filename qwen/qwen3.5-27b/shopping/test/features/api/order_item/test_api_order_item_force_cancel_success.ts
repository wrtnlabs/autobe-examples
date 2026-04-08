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
 * Test the primary success path of administrator force-cancelling an order item.
 *
 * Validates that an administrator can force-cancel an order item with 'paid' status, changing it immediately to 'cancelled' without seller approval. The test verifies the complete order lifecycle from product creation through checkout to force cancellation, ensuring the order item status updates correctly and all snapshot data is preserved in the response.
 *
 * Special attention is given to verifying that the force-cancel operation bypasses the normal cancellation workflow, immediately changes the item status to cancelled, and returns the updated order item with all snapshot data intact.
 *
 * 1. Administrator registers and authenticates to access force-cancel operation.
 * 2. Seller registers and authenticates to create products.
 * 3. Customer registers and authenticates to place orders.
 * 4. Seller creates a product with variants for customer to purchase.
 * 5. Customer creates a shipping address for order delivery.
 * 6. Customer adds product variant to shopping cart.
 * 7. Customer places order through checkout process.
 * 8. Administrator force-cancels the order item with a reason.
 * 9. Validates order item status changes to 'cancelled'.
 * 10. Validates response contains updated order item with snapshot data preserved.
 */
export async function test_api_order_item_force_cancel_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 4. Seller creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<number & tags.Type<"uint32">>(),
      },
    },
  );
  typia.assert(product);
  // 5. Customer creates shipping address
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection,
    {},
  );
  typia.assert(address);
  // 6. Customer adds product variant to cart
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
  // 7. Customer places order
  const order = await generate_random_shopping_mall_customer_checkout(
    customerConnection,
    {
      body: {
        shopping_mall_customer_address_id: address.id,
        payment_token: "test_payment_token",
      },
    },
  );
  typia.assert(order);
  // Get the first order item
  const orderItem = order.items[0];
  typia.assert(orderItem);
  // 8. Administrator force-cancels the order item
  const cancelledItem =
    await api.functional.shoppingMall.administrator.orders.items.force_cancel.forceCancel(
      adminConnection,
      {
        orderId: order.id,
        itemId: orderItem.id,
        body: {
          reason: "Administrator force-cancel for testing purposes",
        } satisfies IShoppingMallOrderItem.IForceCancelRequest,
      },
    );
  typia.assert(cancelledItem);
  // 9. Validate order item status is 'cancelled'
  TestValidator.equals(
    "order item status is cancelled",
    cancelledItem.status,
    "cancelled",
  );
  // 10. Validate snapshot data is preserved
  TestValidator.predicate(
    "product name preserved",
    cancelledItem.product_name.length > 0,
  );
  TestValidator.predicate(
    "product description preserved",
    cancelledItem.product_description.length > 0,
  );
  TestValidator.predicate(
    "variant SKU preserved",
    cancelledItem.variant_sku_code.length > 0,
  );
  TestValidator.predicate(
    "seller shop name preserved",
    cancelledItem.seller_shop_name.length > 0,
  );
}
