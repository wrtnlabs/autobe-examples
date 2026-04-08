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

export async function test_api_product_variant_option_update_success(
  connection: api.IConnection,
) {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create category (required for product creation)
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  // 3. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 4. Create product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
      } satisfies Partial<IEcommerceMallProduct.ICreate>,
    },
  );
  // 5. Create product variant
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  // 6. Create variant option with initial values
  const option =
    await generate_random_ecommerce_mall_seller_products_variants_options_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
          productVariantId: variant.id,
        },
        body: {
          optionName: "Color",
          optionValue: "Red",
        } satisfies IEcommerceMallProductVariantOption.ICreate,
      },
    );
  typia.assert(option);
  // Store original values for validation
  const originalId = option.id;
  const originalCreatedAt = option.createdAt;
  const originalProductVariantId = option.productVariantId;
  // 7. Update the variant option
  const updatedOption =
    await api.functional.ecommerceMall.seller.products.variants.options.update(
      sellerConnection,
      {
        productId: product.id,
        productVariantId: variant.id,
        productVariantOptionId: option.id,
        body: {
          optionName: "Colour",
          optionValue: "Crimson",
        } satisfies IEcommerceMallProductVariantOption.IUpdate,
      },
    );
  typia.assert(updatedOption);
  // 8. Validate response
  TestValidator.equals("id unchanged", updatedOption.id, originalId);
  TestValidator.equals(
    "productVariantId unchanged",
    updatedOption.productVariantId,
    originalProductVariantId,
  );
  TestValidator.equals(
    "createdAt unchanged",
    updatedOption.createdAt,
    originalCreatedAt,
  );
  TestValidator.equals(
    "optionName updated",
    updatedOption.optionName,
    "Colour",
  );
  TestValidator.equals(
    "optionValue updated",
    updatedOption.optionValue,
    "Crimson",
  );
  TestValidator.predicate(
    "updatedAt is newer",
    new Date(updatedOption.updatedAt).getTime() >
      new Date(originalCreatedAt).getTime(),
  );
}
