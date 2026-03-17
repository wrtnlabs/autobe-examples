import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
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
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

/**
 * Test product variant creation with default values.
 * Verifies that system automatically applies default values for optional fields:
 * - price defaults to null (uses product base price)
 * - stock defaults to 0 (no inventory record created)
 */
export async function test_api_product_variant_create_with_defaults(
  connection: api.IConnection,
) {
  // 1. Setup admin connection to create category
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
    },
  });
  typia.assert(admin);
  // 2. Create category for the product
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
      },
    },
  );
  typia.assert(category);
  // 3. Setup seller connection
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
    },
  });
  typia.assert(seller);
  // 4. Create parent product with basePrice 49.99
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: category.id,
        basePrice: 49.99,
      },
    },
  );
  typia.assert(product);
  // 5. Create variant with ONLY required fields (skuCode and options)
  // Omitting price and stock to test defaults
  const variant =
    await api.functional.ecommerceMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          skuCode: "SKU-BLUE-MED-002",
          options: [
            {
              optionName: "color",
              optionValue: "Blue",
            } satisfies IEcommerceMallProductVariantOption.ICreate,
          ],
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 6. Validate default values were applied
  TestValidator.equals("productId matches", variant.productId, product.id);
  TestValidator.equals(
    "skuCode matches input",
    variant.skuCode,
    "SKU-BLUE-MED-002",
  );
  TestValidator.equals("price is null (default)", variant.price, null);
  TestValidator.equals(
    "stockQuantity is 0 (default)",
    variant.stockQuantity,
    0,
  );
  TestValidator.predicate(
    "has valid uuid id",
    typia.is<string & tags.Format<"uuid">>(variant.id),
  );
  TestValidator.predicate(
    "createdAt is valid ISO timestamp",
    typia.is<string & tags.Format<"date-time">>(variant.createdAt),
  );
  TestValidator.predicate(
    "updatedAt is valid ISO timestamp",
    typia.is<string & tags.Format<"date-time">>(variant.updatedAt),
  );
  TestValidator.equals(
    "optionValues has correct option",
    variant.optionValues.length,
    1,
  );
  TestValidator.equals(
    "optionName is correct",
    variant.optionValues[0]!.optionName,
    "color",
  );
  TestValidator.equals(
    "optionValue is correct",
    variant.optionValues[0]!.optionValue,
    "Blue",
  );
}
