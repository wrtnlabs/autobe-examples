import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test the primary success path where an approved seller creates the first variant for their product.
 *
 * This scenario validates:
 * 1. Seller Authentication: Authenticate as an approved seller
 * 2. Product Creation: Create a product without variants (initially unavailable)
 * 3. First Variant Creation: Create variant with unique SKU and option values
 * 4. Database Verification: Verify all fields populated correctly
 * 5. Product Relationship: Verify variant associated with parent product
 */
export async function test_api_product_variant_first_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller Authentication - Create seller-specific connection
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      shopName: RandomGenerator.name(),
    },
  });
  typia.assert(seller);
  // 2. Create Product - Product exists without variants initially
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  // Verify product created without variants (unavailable for purchase)
  TestValidator.equals(
    "product has no variants initially",
    product.variants.length,
    0,
  );
  // 3. Create First Variant with unique SKU code
  const skuCode = `SKU-${RandomGenerator.alphaNumeric(8).toUpperCase()}`;
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          sku_code: skuCode,
          option_values: {
            color: "Red",
            size: "Large",
          },
        },
      },
    );
  typia.assert(variant);
  // 4. Database Verification - Verify variant fields
  TestValidator.equals("variant SKU code matches", variant.sku_code, skuCode);
  TestValidator.equals("variant option values match", variant.option_values, {
    color: "Red",
    size: "Large",
  });
  TestValidator.equals(
    "variant price is null (uses product base_price)",
    variant.price,
    null,
  );
  TestValidator.equals(
    "variant stock_quantity is 0 (no inventory records)",
    variant.stock_quantity,
    0,
  );
  TestValidator.predicate(
    "variant has valid UUID id",
    typia.is<string & tags.Format<"uuid">>(variant.id),
  );
  TestValidator.predicate(
    "variant has created_at timestamp",
    variant.created_at !== null,
  );
  TestValidator.predicate(
    "variant has updated_at timestamp",
    variant.updated_at !== null,
  );
  TestValidator.equals(
    "variant deleted_at is null (active)",
    variant.deleted_at,
    null,
  );
  // 5. Product Relationship Verification
  TestValidator.equals(
    "variant product reference matches",
    variant.product.id,
    product.id,
  );
}
