import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_cart_create } from "../../../generate/generate_random_shopping_mall_customer_cart_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

export async function test_api_cart_item_partial_removal(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Setup: Seller authentication and approval
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: sellerAuth.id,
  });
  // Setup: Create Product A with Variant A (with stock)
  const productA = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(productA);
  const variantA =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: productA.id },
        body: {
          skuCode: `SKU-A-${RandomGenerator.alphaNumeric(6)}`,
          price: null,
          optionValues: [
            { key: "color", value: "Red" },
            { key: "size", value: "Medium" },
          ],
          stockQuantity: 100,
        },
      },
    );
  typia.assert(variantA);
  // Setup: Create Product B with Variant B (different product, with stock)
  const productB = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(productB);
  const variantB =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: productB.id },
        body: {
          skuCode: `SKU-B-${RandomGenerator.alphaNumeric(6)}`,
          price: null,
          optionValues: [
            { key: "color", value: "Blue" },
            { key: "size", value: "Large" },
          ],
          stockQuantity: 50,
        },
      },
    );
  typia.assert(variantB);
  // Setup: Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // Customer adds Variant A to cart (Cart Item 1)
  const cartItem1 = await generate_random_shopping_mall_customer_cart_create(
    customerConnection,
    {
      body: {
        variantId: variantA.id,
        quantity: 2,
      },
    },
  );
  typia.assert(cartItem1);
  // Customer adds Variant B to cart (Cart Item 2)
  const cartItem2 = await generate_random_shopping_mall_customer_cart_create(
    customerConnection,
    {
      body: {
        variantId: variantB.id,
        quantity: 3,
      },
    },
  );
  typia.assert(cartItem2);
  // Verify both cart items have different IDs (independent items)
  TestValidator.notEquals(
    "cart items have different IDs",
    cartItem1.id,
    cartItem2.id,
  );
  // Store cart item IDs for verification
  const cartItem1Id = cartItem1.id;
  const cartItem2Id = cartItem2.id;
  // Test: Customer deletes Cart Item 1
  await api.functional.shoppingMall.customer.customers.me.cart.erase(
    customerConnection,
    { cartItemId: cartItem1Id },
  );
  // Verification: Cart Item 2 should still exist (not affected by deletion of Cart Item 1)
  // We verify this by successfully deleting Cart Item 2 (if it didn't exist, this would fail)
  await api.functional.shoppingMall.customer.customers.me.cart.erase(
    customerConnection,
    { cartItemId: cartItem2Id },
  );
  // Verification: Cart Item 1 should no longer exist
  // Attempting to delete it again should fail (404 Not Found)
  await TestValidator.error(
    "deleted cart item cannot be deleted again",
    async () => {
      await api.functional.shoppingMall.customer.customers.me.cart.erase(
        customerConnection,
        { cartItemId: cartItem1Id },
      );
    },
  );
}
