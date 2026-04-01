import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test that adding the same product variant multiple times merges quantities
 * instead of creating duplicate cart items.
 *
 * **Test Steps:**
 * 1. Register a new customer account and log in
 * 2. Register a seller account and log in
 * 3. Seller creates a product with a category
 * 4. Seller creates a product variant
 * 5. Customer adds the variant to cart with quantity 3
 * 6. Customer adds the same variant again with quantity 5
 * 7. Verify the cart contains only ONE cart item for this variant
 * 8. Verify the quantity is 8 (3 + 5), not two separate items
 *
 * **Validation Points:**
 * - Only one cart item exists for the variant (no duplicates)
 * - Quantity is the sum of both addition requests (3 + 5 = 8)
 * - Price remains the original captured price (not recalculated)
 * - updated_at timestamp is updated on the second addition
 * - Cart total_amount reflects merged quantity × price
 * - Cart items_count remains 1 (not incremented on merge)
 */
export async function test_api_cart_item_quantity_merge(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 3. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Seller creates a product variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price_override: null,
          option_value_ids: [],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 5. Customer adds variant to cart with quantity 3
  const firstCartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          shopping_mall_product_variant_id: variant.id,
          quantity: 3,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(firstCartItem);
  // Capture the price from first addition
  const capturedPrice = firstCartItem.price;
  const firstCreatedAt = firstCartItem.created_at;
  // Small delay to ensure updated_at will be different
  await new Promise((resolve) => setTimeout(resolve, 10));
  // 6. Customer adds the SAME variant again with quantity 5
  const secondCartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          shopping_mall_product_variant_id: variant.id,
          quantity: 5,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(secondCartItem);
  // 7. Validate quantity merge
  TestValidator.equals(
    "merged quantity should be 8 (3 + 5)",
    secondCartItem.quantity,
    8,
  );
  // 8. Validate no duplicate - should be same cart item ID
  TestValidator.equals(
    "cart item ID should be same (no duplicate created)",
    secondCartItem.id,
    firstCartItem.id,
  );
  // 9. Validate price remains captured price
  TestValidator.equals(
    "price should remain captured price from first addition",
    secondCartItem.price,
    capturedPrice,
  );
  // 10. Validate updated_at is updated
  TestValidator.predicate(
    "updated_at should be updated on second addition",
    secondCartItem.updated_at > firstCreatedAt,
  );
  // 11. Validate cart summary
  const cart = secondCartItem.cart;
  TestValidator.equals(
    "cart items_count should be 1 (not 2)",
    cart.items_count,
    1,
  );
  TestValidator.equals(
    "cart total_amount should be quantity × price (8 × capturedPrice)",
    cart.total_amount,
    8 * capturedPrice,
  );
  // 12. Validate product variant reference
  TestValidator.equals(
    "product variant ID should match",
    secondCartItem.productVariant.id,
    variant.id,
  );
  TestValidator.equals(
    "product variant SKU should match",
    secondCartItem.productVariant.sku_code,
    variant.skuCode,
  );
}
