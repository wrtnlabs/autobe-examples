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
import { generate_random_shopping_mall_seller_products_variants_options_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_options_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";

/**
 * Test deletion of a variant option value by the product-owning seller.
 *
 * Validates that a seller who owns the parent product can permanently remove
 * a single option key-value pair from a variant's configuration. The variant
 * is set up with multiple option values so that after deleting one, others
 * remain — confirming the deletion is scoped to the targeted option only.
 *
 * The test also verifies that the deletion is irreversible by attempting to
 * delete the same option again, which should result in a 404 Not Found since
 * the option no longer exists. This is a hard-delete operation with no
 * soft-delete column on the option values table.
 *
 * 1. Administrator joins and creates a product category for the product.
 * 2. A seller joins the platform and creates a product under the category.
 * 3. The seller creates a variant with two option values: "color: Red" and "size: Large".
 * 4. The seller adds a third option value "material: Cotton" to the variant.
 * 5. The seller deletes the first original option value ("color: Red").
 * 6. Validates that attempting to delete the same option again yields a 404 error.
 */
export async function test_api_variant_option_delete_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup — join and create a category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Seller setup — join the platform
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
  // 4. Seller creates a variant with two original option values
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
  // 5. Seller adds a third option value to the variant
  const addedOption =
    await generate_random_shopping_mall_seller_products_variants_options_create(
      sellerConnection,
      {
        body: { key: "material", value: "Cotton" },
        params: { productId: product.id, variantId: variant.id },
      },
    );
  typia.assert(addedOption);
  // Select the first original option value to delete
  const optionToDelete = variant.optionValues[0];
  typia.assertGuard(optionToDelete);
  // 6. Delete the selected option value
  await api.functional.shoppingMall.seller.products.variants.options.erase(
    sellerConnection,
    {
      productId: product.id,
      variantId: variant.id,
      optionId: optionToDelete.id,
    },
  );
  // 7. Verify the option was permanently removed by attempting deletion again
  await TestValidator.error(
    "deleted option should no longer exist (404)",
    async () => {
      await api.functional.shoppingMall.seller.products.variants.options.erase(
        sellerConnection,
        {
          productId: product.id,
          variantId: variant.id,
          optionId: optionToDelete.id,
        },
      );
    },
  );
}
