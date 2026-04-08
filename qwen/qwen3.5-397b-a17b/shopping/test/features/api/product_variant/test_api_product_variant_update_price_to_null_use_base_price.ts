import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test variant price override nullification to use product base price.
 *
 * Validates the edge case where a seller updates a variant's price to null, causing the variant to fall back to the parent product's base price instead of using a variant-specific override. This behavior is critical for pricing logic in shopping cart operations and customer display.
 *
 * The test creates a product with base price 10000, then creates a variant with price override 15000. The variant is then updated with price set to null. The test verifies that the update succeeds, the variant's price field becomes null in the response, and the variant will correctly use the product's base price for subsequent operations.
 *
 * 1. Administrator creates a category for product organization.
 * 2. Seller creates a product with base price 10000.
 * 3. Seller creates a variant with price override 15000.
 * 4. Seller updates the variant setting price to null.
 * 5. Validates that the variant price is null and the product base price remains 10000.
 */
export async function test_api_product_variant_update_price_to_null_use_base_price(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    },
  });
  const category =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller setup - register with known password
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  await authorize_seller_join(
    { host: connection.host },
    {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Create product with base price 10000
  const productBasePrice = 10000;
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_mall_category_id: category.id,
        base_price: productBasePrice,
      },
    },
  );
  typia.assert(product);
  // 4. Create variant with price override 15000
  const variantPriceOverride = 15000;
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          price: variantPriceOverride,
        },
      },
    );
  typia.assert(variant);
  // Validate initial variant price
  TestValidator.equals(
    "initial variant price override",
    variant.price,
    variantPriceOverride,
  );
  TestValidator.equals(
    "product base price",
    product.base_price,
    productBasePrice,
  );
  // 5. Update variant setting price to null
  const updatedVariant =
    await api.functional.shoppingMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          price: null,
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // 6. Validate the update results
  TestValidator.equals(
    "variant price is null after update",
    updatedVariant.price,
    null,
  );
  TestValidator.equals(
    "variant SKU unchanged",
    updatedVariant.sku_code,
    variant.sku_code,
  );
  TestValidator.equals(
    "variant option values unchanged",
    updatedVariant.option_values,
    variant.option_values,
  );
  TestValidator.predicate(
    "variant updated_at is newer",
    updatedVariant.updated_at > variant.updated_at,
  );
  // 7. Validate that the variant's product reference still has the base price
  TestValidator.equals(
    "product base price unchanged",
    updatedVariant.product.base_price,
    productBasePrice,
  );
}