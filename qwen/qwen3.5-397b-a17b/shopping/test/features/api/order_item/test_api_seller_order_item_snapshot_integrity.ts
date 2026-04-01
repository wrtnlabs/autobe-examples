import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test that order item retrieval preserves snapshot integrity showing product, variant,
 * and seller data as they existed at purchase time.
 *
 * This test validates that order item snapshots are immutable and preserve historical
 * transaction state for dispute resolution and record-keeping purposes. The test:
 * 1. Creates a seller account and product with specific values
 * 2. Creates a variant with specific SKU code and price
 * 3. Creates a customer account and places an order
 * 4. Modifies the product, variant, and seller profile after order placement
 * 5. Verifies the order item still shows original values from purchase time
 */
export async function test_api_seller_order_item_snapshot_integrity(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and login
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // Re-login to get fresh session
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create product with specific initial values
  const originalProductName = RandomGenerator.paragraph({ sentences: 2 });
  const originalProductDescription = RandomGenerator.content({ paragraphs: 2 });
  const originalProductPrice = 50000;
  // Generate a category ID (category creation not available in provided APIs)
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerLoginConnection,
    {
      body: {
        name: originalProductName,
        description: originalProductDescription,
        category_id: categoryId,
        base_price: originalProductPrice,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Create variant with specific SKU code and price override
  const originalSkuCode = `SKU-${RandomGenerator.alphaNumeric(8).toUpperCase()}`;
  const originalVariantPrice = 55000;
  const variant =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerLoginConnection,
      {
        productId: product.id,
        body: {
          sku_code: originalSkuCode,
          price_override: originalVariantPrice,
          option_value_ids: [],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 4. Customer registration and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: "CustomerPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const customerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerLoginConnection, {
    body: {
      email: customerEmail,
      password: "CustomerPass123!",
    },
  });
  // 5. Add variant to customer cart
  const cartItem = await api.functional.shoppingMall.customer.cart.items.create(
    customerLoginConnection,
    {
      body: {
        shopping_mall_product_variant_id: variant.id,
        quantity: 2,
      } satisfies IShoppingMallCartItem.ICreate,
    },
  );
  typia.assert(cartItem);
  // 6. Create order (this captures snapshots)
  const order = await api.functional.shoppingMall.customer.orders.create(
    customerLoginConnection,
    {
      body: {
        shopping_mall_address_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // Get the order item ID
  const orderItem = order.orderItems[0];
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  // 7. Modify product after order (changes should NOT affect order item snapshot)
  const updatedProductName = RandomGenerator.paragraph({ sentences: 3 });
  const updatedProductDescription = RandomGenerator.content({ paragraphs: 3 });
  const updatedProductPrice = 99999;
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(
      sellerLoginConnection,
      {
        productId: product.id,
        body: {
          name: updatedProductName,
          description: updatedProductDescription,
          base_price: updatedProductPrice,
        } satisfies IShoppingMallProduct.IUpdate,
      },
    );
  typia.assert(updatedProduct);
  // 8. Modify variant after order (changes should NOT affect order item snapshot)
  const updatedSkuCode = `SKU-UPDATED-${RandomGenerator.alphaNumeric(6).toUpperCase()}`;
  const updatedVariantPrice = 88888;
  const updatedVariant =
    await api.functional.shoppingMall.seller.products.variants.update(
      sellerLoginConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          sku_code: updatedSkuCode,
          price_override: updatedVariantPrice,
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // 9. Modify seller profile after order (changes should NOT affect order item snapshot)
  const updatedShopName = RandomGenerator.name();
  const updatedDescription = RandomGenerator.paragraph({ sentences: 2 });
  const updatedProfile =
    await api.functional.shoppingMall.sellers.profile.update(
      sellerLoginConnection,
      {
        body: {
          shop_name: updatedShopName,
          description: updatedDescription,
        } satisfies IShoppingMallSellerProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // 10. Retrieve order item and verify snapshot integrity
  const retrievedOrderItem =
    await api.functional.shoppingMall.seller.orders.items.at(
      sellerLoginConnection,
      {
        itemId: orderItem.id,
      },
    );
  typia.assert(retrievedOrderItem);
  // Verify order item price is snapshotted (unit price at purchase time)
  TestValidator.equals(
    "order item unit price preserved from purchase time",
    retrievedOrderItem.price,
    originalVariantPrice,
  );
  // Verify variant snapshot preserves original SKU code
  TestValidator.equals(
    "variant SKU code preserved in snapshot",
    retrievedOrderItem.productVariant.sku_code,
    originalSkuCode,
  );
  // Verify variant snapshot preserves original price override
  TestValidator.equals(
    "variant price override preserved in snapshot",
    retrievedOrderItem.productVariant.price_override,
    originalVariantPrice,
  );
  // Verify seller snapshot preserves original email
  TestValidator.equals(
    "seller email preserved in snapshot",
    retrievedOrderItem.seller.email,
    sellerEmail,
  );
  // Note: IShoppingMallProduct.ISummary only contains min/max price range,
  // not full product details. The order item's own price field contains
  // the snapshotted unit price at purchase time.
}
