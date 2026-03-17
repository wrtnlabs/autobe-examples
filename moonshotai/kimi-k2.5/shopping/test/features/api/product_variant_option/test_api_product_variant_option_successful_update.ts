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

export async function test_api_product_variant_option_successful_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a category (required for product creation)
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 3. Create seller connection and authenticate as approved seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 4. Create a product under the category
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
        name: RandomGenerator.name(),
        description: RandomGenerator.content(),
        basePrice: typia.random<number & tags.Minimum<1>>(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 5. Create a variant for the product
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
  // 6. Create an option for the variant (e.g., Color: Red)
  const initialOption =
    await generate_random_ecommerce_mall_seller_variants_options_create(
      sellerConnection,
      {
        params: {
          variantId: variant.id,
        },
        body: {
          optionName: "Color",
          optionValue: "Red",
        } satisfies IEcommerceMallProductVariantOption.ICreate,
      },
    );
  typia.assert(initialOption);
  // Store original values before update
  const originalId = initialOption.id;
  const originalProductVariantId = initialOption.productVariantId;
  const originalOptionName = initialOption.optionName;
  const originalCreatedAt = initialOption.createdAt;
  const originalUpdatedAt = initialOption.updatedAt;
  // 7. Execute the update operation - change option value from "Red" to "Crimson"
  const updatedOption =
    await api.functional.ecommerceMall.seller.variants.options.update(
      sellerConnection,
      {
        variantId: variant.id,
        optionId: initialOption.id,
        body: {
          option_value: "Crimson",
        } satisfies IEcommerceMallProductVariantOption.IUpdate,
      },
    );
  typia.assert(updatedOption);
  // 8. Validate the response
  // Verify option value changed
  TestValidator.equals(
    "option value should be updated to 'Crimson'",
    updatedOption.optionValue,
    "Crimson",
  );
  // Verify option name remains unchanged
  TestValidator.equals(
    "option name should remain unchanged",
    updatedOption.optionName,
    originalOptionName,
  );
  // Verify id remains unchanged
  TestValidator.equals(
    "option id should remain unchanged",
    updatedOption.id,
    originalId,
  );
  // Verify productVariantId remains unchanged
  TestValidator.equals(
    "product variant id should remain unchanged",
    updatedOption.productVariantId,
    originalProductVariantId,
  );
  // Verify createdAt remains unchanged
  TestValidator.equals(
    "created at timestamp should remain unchanged",
    updatedOption.createdAt,
    originalCreatedAt,
  );
  // Verify updatedAt was refreshed (should be greater than original)
  TestValidator.predicate(
    "updated at timestamp should be refreshed (newer than original)",
    new Date(updatedOption.updatedAt) > new Date(originalUpdatedAt),
  );
  // Verify old value is not present
  TestValidator.notEquals(
    "option value should not be the old value",
    updatedOption.optionValue,
    "Red",
  );
}
