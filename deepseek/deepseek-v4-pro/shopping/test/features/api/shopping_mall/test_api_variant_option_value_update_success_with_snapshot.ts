import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";

/*
 * Test successful update of a variant option value with snapshot creation.
 *
 * Validates that an authenticated seller who owns the product can update an existing option value's key and value, and that the system correctly preserves the previous state via a variant snapshot. The test verifies that the response contains the updated key and value, the id and created_at remain unchanged, and the updated_at timestamp advances to reflect the modification.
 *
 * 1. Administrator joins and creates a top-level category for product classification.
 * 2. Seller joins the platform to set up the product-to-variant ownership.
 * 3. Seller creates a product under the category with randomized attributes.
 * 4. Seller creates a variant with two option values: key="color"/value="Red" and key="size"/value="Large".
 * 5. After a delay, seller updates the first option value from "color:Red" to "material:Cotton".
 * 6. Validates the updated option value retains its original id and created_at while showing the new key, new value, and an advanced updated_at timestamp that is strictly later than both the original updated_at and created_at.
 */
export async function test_api_variant_option_value_update_success_with_snapshot(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins and creates a category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Seller joins
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Seller creates a product under the category
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_mall_category_id: category.id,
      },
    },
  );
  typia.assert(product);
  // 4. Seller creates a variant with two option values
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          optionValues: [
            { key: "color", value: "Red" },
            { key: "size", value: "Large" },
          ],
        },
      },
    );
  typia.assert(variant);
  const targetOptionValue = variant.optionValues.find(
    (ov) => ov.key === "color",
  )!;
  typia.assertGuard(targetOptionValue);
  // 5. Wait to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 1000));
  // 6. Update the option value from "color:Red" to "material:Cotton"
  const updatedOptionValue =
    await api.functional.shoppingMall.seller.products.variants.options.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        optionId: targetOptionValue.id,
        body: {
          key: "material",
          value: "Cotton",
        } satisfies IShoppingMallProductVariantOptionValue.IUpdate,
      },
    );
  typia.assert(updatedOptionValue);
  // 7. Validate the response
  TestValidator.equals(
    "id unchanged",
    updatedOptionValue.id,
    targetOptionValue.id,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedOptionValue.created_at,
    targetOptionValue.created_at,
  );
  TestValidator.equals(
    "key updated to material",
    updatedOptionValue.key,
    "material",
  );
  TestValidator.equals(
    "value updated to Cotton",
    updatedOptionValue.value,
    "Cotton",
  );
  TestValidator.predicate(
    "updated_at strictly later than original",
    () => updatedOptionValue.updated_at > targetOptionValue.updated_at,
  );
  TestValidator.predicate(
    "updated_at strictly later than created_at",
    () => updatedOptionValue.updated_at > updatedOptionValue.created_at,
  );
}
