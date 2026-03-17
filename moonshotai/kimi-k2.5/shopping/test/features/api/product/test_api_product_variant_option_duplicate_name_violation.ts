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
import { generate_random_ecommerce_mall_seller_variants_options_create } from "../../../generate/generate_random_ecommerce_mall_seller_variants_options_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

/**
 * Test uniqueness constraint violation when updating option_name to a value that already exists.
 *
 * This test verifies that the database unique constraint @@unique([product_variant_id, option_name])
 * prevents duplicate option names within the same variant. Scenario:
 * 1. Create admin and category
 * 2. Create seller and authenticate
 * 3. Create product with the category
 * 4. Create variant for the product
 * 5. Create two options: "Color" and "Size"
 * 6. Attempt to update "Size" option name to "Color" (duplicate)
 * 7. Verify the operation is rejected with an error
 */
export async function test_api_product_variant_option_duplicate_name_violation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin and category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Create product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
      },
    },
  );
  typia.assert(product);
  // 4. Create variant
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(variant);
  // 5. Create first option: Color
  const colorOption =
    await generate_random_ecommerce_mall_seller_variants_options_create(
      sellerConnection,
      {
        params: {
          variantId: variant.id,
        },
        body: {
          optionName: "Color",
          optionValue: "Red",
        },
      },
    );
  typia.assert(colorOption);
  // 6. Create second option: Size
  const sizeOption =
    await generate_random_ecommerce_mall_seller_variants_options_create(
      sellerConnection,
      {
        params: {
          variantId: variant.id,
        },
        body: {
          optionName: "Size",
          optionValue: "Large",
        },
      },
    );
  typia.assert(sizeOption);
  // 7. Try to update Size option name to Color - should fail due to unique constraint
  await TestValidator.error(
    "duplicate option name update should be rejected",
    async () => {
      await api.functional.ecommerceMall.seller.variants.options.update(
        sellerConnection,
        {
          variantId: variant.id,
          optionId: sizeOption.id,
          body: {
            option_name: "Color",
          } satisfies IEcommerceMallProductVariantOption.IUpdate,
        },
      );
    },
  );
}
