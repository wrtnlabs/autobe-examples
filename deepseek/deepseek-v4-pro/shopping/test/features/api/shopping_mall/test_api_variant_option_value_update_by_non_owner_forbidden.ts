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
 * Verify that a non-owner seller is forbidden from updating an option value on another seller's variant.
 *
 * Tests the authorization boundary for the variant option value update endpoint. A seller who does not own the product must receive a 403 Forbidden response when attempting to modify option values on variants belonging to another seller. The rejected attempt must not alter the original option value or create a variant snapshot.
 *
 * 1. Administrator registers and creates a product category for Seller A's product.
 * 2. Seller A registers, creates a product under the category, and creates a variant with one option value ("color": "Red").
 * 3. Seller B registers separately as a different seller who does not own any part of Seller A's product.
 * 4. Seller B attempts to update Seller A's variant option value — the request is rejected with 403 Forbidden.
 */
export async function test_api_variant_option_value_update_by_non_owner_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup — create a category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    { body: {} },
  );
  typia.assert(category);
  // 2. Seller A — join, create product, create variant with option value
  const sellerAConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerAConnection, {});
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerAConnection,
    { body: { shopping_mall_category_id: category.id } },
  );
  typia.assert(product);
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerAConnection,
      {
        params: { productId: product.id },
        body: {
          optionValues: [
            {
              key: "color",
              value: "Red",
            } satisfies IShoppingMallProductVariantOptionValue.ICreate,
          ],
        },
      },
    );
  typia.assert(variant);
  const originalOptionValue = variant.optionValues[0];
  typia.assert(originalOptionValue);
  // 3. Seller B — join as a different seller
  const sellerBConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerBConnection, {});
  // 4. Seller B attempts to update Seller A's option value — expect 403
  await TestValidator.httpError(
    "non-owner cannot update another seller's variant option value",
    403,
    async () => {
      await api.functional.shoppingMall.seller.products.variants.options.update(
        sellerBConnection,
        {
          productId: product.id,
          variantId: variant.id,
          optionId: originalOptionValue.id,
          body: {
            key: "color",
            value: "Blue",
          } satisfies IShoppingMallProductVariantOptionValue.IUpdate,
        },
      );
    },
  );
}
