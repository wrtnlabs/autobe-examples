import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_mall_seller_products_variants_options_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_options_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

export async function test_api_product_variant_option_partial_removal_multiple_options(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create category as admin
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: { name: RandomGenerator.name() },
    },
  );
  typia.assert(category);
  // 3. Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 4. Create product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: { categoryId: category.id },
    },
  );
  typia.assert(product);
  // 5. Create variant with three options
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(10),
          price: 10000,
          options: [
            {
              optionName: "Color",
              optionValue: "Red",
            } satisfies IEcommerceMallProductVariantOption.ICreate,
            {
              optionName: "Size",
              optionValue: "Large",
            } satisfies IEcommerceMallProductVariantOption.ICreate,
            {
              optionName: "Material",
              optionValue: "Cotton",
            } satisfies IEcommerceMallProductVariantOption.ICreate,
          ],
        },
      },
    );
  typia.assert(variant);
  // 6. Extract option IDs
  const colorOption = variant.variantOptions.find(
    (o) => o.optionName === "Color",
  );
  const sizeOption = variant.variantOptions.find(
    (o) => o.optionName === "Size",
  );
  const materialOption = variant.variantOptions.find(
    (o) => o.optionName === "Material",
  );
  if (!colorOption || !sizeOption || !materialOption) {
    throw new Error("All three options must exist");
  }
  // 7. Delete one option (Color) - partial removal test
  await api.functional.ecommerceMall.seller.products.variants.options.erase(
    sellerConnection,
    {
      productId: product.id,
      productVariantId: variant.id,
      productVariantOptionId: colorOption.id,
    },
  );
  // 8. Verify remaining options are preserved by successfully deleting them
  await api.functional.ecommerceMall.seller.products.variants.options.erase(
    sellerConnection,
    {
      productId: product.id,
      productVariantId: variant.id,
      productVariantOptionId: sizeOption.id,
    },
  );
  await api.functional.ecommerceMall.seller.products.variants.options.erase(
    sellerConnection,
    {
      productId: product.id,
      productVariantId: variant.id,
      productVariantOptionId: materialOption.id,
    },
  );
}
