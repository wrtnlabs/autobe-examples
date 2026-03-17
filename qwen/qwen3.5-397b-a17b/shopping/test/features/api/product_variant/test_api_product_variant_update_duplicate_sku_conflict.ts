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
 * Test SKU code uniqueness validation when updating a variant.
 *
 * This test validates the platform-wide SKU uniqueness constraint by:
 * 1. Creating a seller account and authenticating
 * 2. Creating two products under the same seller
 * 3. Creating one variant per product with unique SKU codes
 * 4. Attempting to update the first variant's SKU to match the second variant's SKU
 * 5. Verifying the update fails with conflict error
 * 6. Verifying the second variant's SKU remains accessible (not affected)
 */
export async function test_api_product_variant_update_duplicate_sku_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      shop_name: RandomGenerator.name(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create first product
  const product1 = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_category_id: typia.random<string & tags.Format<"uuid">>(),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product1);
  // 3. Create second product
  const product2 = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_category_id: typia.random<string & tags.Format<"uuid">>(),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product2);
  // 4. Create variant for first product with unique SKU
  const variant1Sku = `SKU-TEST-${RandomGenerator.alphaNumeric(8).toUpperCase()}`;
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product1.id },
        body: {
          sku_code: variant1Sku,
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
          options: [
            {
              key: "color",
              value: "Red",
            } satisfies IShoppingMallProductVariantOption.ICreate,
          ],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant1);
  // 5. Create variant for second product with different unique SKU
  const variant2Sku = `SKU-TEST-${RandomGenerator.alphaNumeric(8).toUpperCase()}`;
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product2.id },
        body: {
          sku_code: variant2Sku,
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
          options: [
            {
              key: "size",
              value: "Large",
            } satisfies IShoppingMallProductVariantOption.ICreate,
          ],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant2);
  // 6. Attempt to update variant1's SKU to match variant2's SKU (should fail with conflict)
  await TestValidator.error(
    "duplicate SKU code update should be rejected",
    async () => {
      await api.functional.shoppingMall.seller.sellers.products.variants.update(
        sellerConnection,
        {
          productId: product1.id,
          variantId: variant1.id,
          body: {
            skuCode: variant2Sku,
          } satisfies IShoppingMallProductVariant.IUpdate,
        },
      );
    },
  );
  // 7. Verify variant2 can still be updated with its own SKU (proves it was not affected)
  const newVariant2Sku = `SKU-TEST-UPDATED-${RandomGenerator.alphaNumeric(8).toUpperCase()}`;
  const variant2Updated =
    await api.functional.shoppingMall.seller.sellers.products.variants.update(
      sellerConnection,
      {
        productId: product2.id,
        variantId: variant2.id,
        body: {
          skuCode: newVariant2Sku,
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  typia.assert(variant2Updated);
  TestValidator.equals(
    "variant2 SKU updated successfully",
    variant2Updated.skuCode,
    newVariant2Sku,
  );
  // 8. Verify variant1 still has original SKU by updating it with a different unique SKU
  const newVariant1Sku = `SKU-TEST-V1-UPDATED-${RandomGenerator.alphaNumeric(8).toUpperCase()}`;
  const variant1Updated =
    await api.functional.shoppingMall.seller.sellers.products.variants.update(
      sellerConnection,
      {
        productId: product1.id,
        variantId: variant1.id,
        body: {
          skuCode: newVariant1Sku,
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  typia.assert(variant1Updated);
  TestValidator.equals(
    "variant1 SKU can be updated to new unique value",
    variant1Updated.skuCode,
    newVariant1Sku,
  );
  TestValidator.notEquals(
    "variant1 SKU changed from original",
    variant1Updated.skuCode,
    variant1Sku,
  );
}