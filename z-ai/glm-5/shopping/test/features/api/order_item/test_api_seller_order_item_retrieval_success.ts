import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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
import { generate_random_shopping_mall_customer_checkout_complete } from "../../../generate/generate_random_shopping_mall_customer_checkout_complete";
import { generate_random_shopping_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_customers_cart_items_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test that a seller can successfully retrieve detailed information about an order item for a product they own.
 *
 * Workflow:
 * 1. Seller registers and creates a product with a variant
 * 2. Customer registers and places an order containing the seller's product
 * 3. Seller retrieves the order item and validates all details
 */
export async function test_api_seller_order_item_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - create seller-specific connection
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      shopName: RandomGenerator.name(1),
      shopDescription: RandomGenerator.paragraph({ sentences: 3 }),
    },
  });
  typia.assert(sellerAuth);
  // 2. Seller creates a product
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          basePrice: typia.random<
            number & tags.Minimum<1000> & tags.Maximum<100000>
          >(),
        },
      },
    );
  typia.assert(product);
  // 3. Seller creates a variant for the product
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: RandomGenerator.alphaNumeric(8).toUpperCase(),
          option_values: {
            color: RandomGenerator.pick(["Red", "Blue", "Black"] as const),
          },
          price: product.base_price * 1.1,
        },
      },
    );
  typia.assert(variant);
  // 4. Customer setup - create customer-specific connection
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // 5. Customer adds product to cart
  const orderQuantity = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
  >();
  const cartItem =
    await generate_random_shopping_mall_customer_customers_cart_items_create(
      customerConnection,
      {
        body: {
          variantId: variant.id,
          quantity: orderQuantity,
        },
      },
    );
  typia.assert(cartItem);
  // 6. Customer completes checkout
  // Note: The generate function handles address creation internally or uses a default
  const order = await generate_random_shopping_mall_customer_checkout_complete(
    customerConnection,
    {
      body: {
        addressId: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(order);
  // Extract the order item for the seller's product
  const orderItem = order.orderItems.find(
    (item) => item.product.id === product.id,
  );
  TestValidator.predicate(
    "order item exists for seller product",
    orderItem !== undefined,
  );
  const validatedOrderItem = typia.assert(orderItem!);
  // 7. Seller retrieves the order item
  const retrievedItem = await api.functional.shoppingMall.seller.orderItems.at(
    sellerConnection,
    { itemId: validatedOrderItem.id },
  );
  typia.assert(retrievedItem);
  // 8. Validate order item details
  TestValidator.equals(
    "quantity matches",
    retrievedItem.quantity,
    orderQuantity,
  );
  const expectedPrice = (variant.price ?? product.base_price) satisfies number;
  TestValidator.equals(
    "price matches variant",
    retrievedItem.price,
    expectedPrice,
  );
  TestValidator.equals("status is paid", retrievedItem.status, "paid");
  TestValidator.equals("product matches", retrievedItem.product.id, product.id);
  TestValidator.equals("variant matches", retrievedItem.variant.id, variant.id);
  TestValidator.equals(
    "seller matches",
    retrievedItem.seller.id,
    sellerAuth.id,
  );
  // Validate snapshot preserves purchase-time details
  TestValidator.equals(
    "snapshot product name",
    retrievedItem.snapshot.productName,
    product.name,
  );
  TestValidator.equals(
    "snapshot product description",
    retrievedItem.snapshot.productDescription,
    product.description,
  );
  TestValidator.equals(
    "snapshot seller shop name",
    retrievedItem.snapshot.sellerShopName,
    sellerAuth.shop_name,
  );
  // Validate shipment is null (not shipped yet)
  TestValidator.predicate(
    "shipment is null before shipping",
    retrievedItem.shipment === null,
  );
}
