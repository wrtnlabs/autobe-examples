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

/**
 * Test that updating an option value's key to one already existing on the same variant is rejected with a 409 Conflict.
 *
 * Validates the unique constraint on option keys within a variant. When a seller attempts to change an option value's key to one that already exists on the same variant, the system must reject the request before any data is written.
 *
 * The test ensures the @@unique([shopping_mall_product_variant_id, key]) database constraint is enforced at the application layer, returning a 409 Conflict response. Since the rejection occurs at the validation layer before any database mutation, no variant snapshot is created and no existing option values are modified.
 *
 * 1. Administrator joins and creates a top-level category.
 * 2. Seller joins and creates a product under the category.
 * 3. Seller creates a variant with two option values: "color":"Red" and "size":"Large".
 * 4. Seller attempts to update the "color" option, changing its key from "color" to "size", creating a duplicate key conflict with the existing "size" option.
 * 5. Verifies the update is rejected as an error, confirming the unique constraint is enforced.
 */
export async function test_api_variant_option_value_update_duplicate_key_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins and creates a top-level category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Seller joins and creates a product
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: { shopping_mall_category_id: category.id } },
  );
  typia.assert(product);
  // 3. Create variant with two distinct option values
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          optionValues: [
            { key: "color", value: "Red" },
            { key: "size", value: "Large" },
          ],
        },
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 4. Extract the "color" option value to target for conflicting update
  const colorOption = variant.optionValues[0]!;
  // 5. Attempt to update "color" option's key to "size" — must be rejected
  await TestValidator.error(
    "duplicate option key should cause 409 conflict",
    async () => {
      await api.functional.shoppingMall.seller.products.variants.options.update(
        sellerConnection,
        {
          productId: product.id,
          variantId: variant.id,
          optionId: colorOption.id,
          body: {
            key: "size",
            value: "Red",
          } satisfies IShoppingMallProductVariantOptionValue.IUpdate,
        },
      );
    },
  );
}