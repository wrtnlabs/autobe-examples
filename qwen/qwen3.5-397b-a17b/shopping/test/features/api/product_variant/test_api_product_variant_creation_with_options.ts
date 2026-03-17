import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistic";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

/**
 * Test product variant creation with options.
 *
 * This test validates the complete workflow:
 * 1. Seller registers and authenticates
 * 2. Seller creates a product with required fields
 * 3. Seller adds a variant with unique SKU, option key-value pairs, price override, and stock
 * 4. Validate variant is created with all options and proper structure
 */
export async function test_api_product_variant_creation_with_options(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication via join
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create a product to attach variant to
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  TestValidator.predicate("product has valid id", product.id.length > 0);
  // 3. Create variant with options
  const inputSkuCode = `SKU-${RandomGenerator.alphaNumeric(12)}`;
  const inputPrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000>
  >();
  const inputStockQuantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >();
  const variantOptions: IShoppingMallProductVariantOption.ICreate[] = [
    {
      key: "color",
      value: "Red",
    },
    {
      key: "size",
      value: "Large",
    },
  ];
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: inputSkuCode,
          price: inputPrice,
          stock_quantity: inputStockQuantity,
          options: variantOptions,
        },
      },
    );
  typia.assert(variant);
  // 4. Validate variant structure against input
  TestValidator.equals(
    "variant sku matches input",
    variant.skuCode,
    inputSkuCode,
  );
  TestValidator.predicate("variant has valid id", variant.id.length > 0);
  TestValidator.equals(
    "variant stock matches input",
    variant.stockQuantity,
    inputStockQuantity,
  );
  TestValidator.equals(
    "variant price matches input",
    variant.price,
    inputPrice,
  );
  // 5. Validate variant options
  TestValidator.equals("variant has 2 options", variant.options.length, 2);
  const colorOption = variant.options.find((opt) => opt.key === "color");
  TestValidator.predicate("color option exists", colorOption !== undefined);
  TestValidator.equals("color option value", colorOption!.value, "Red");
  const sizeOption = variant.options.find((opt) => opt.key === "size");
  TestValidator.predicate("size option exists", sizeOption !== undefined);
  TestValidator.equals("size option value", sizeOption!.value, "Large");
  // 6. Validate variant is linked to correct product
  TestValidator.equals(
    "variant product id matches",
    variant.product.id,
    product.id,
  );
  TestValidator.equals(
    "variant product name matches",
    variant.product.name,
    product.name,
  );
  // 7. Validate timestamps exist
  TestValidator.predicate(
    "variant has created_at",
    variant.createdAt.length > 0,
  );
  TestValidator.predicate(
    "variant has updated_at",
    variant.updatedAt.length > 0,
  );
  TestValidator.predicate(
    "variant deletedAt is null",
    variant.deletedAt === null,
  );
}
