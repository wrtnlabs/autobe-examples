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
 * Test variant option values replacement semantics on update.
 *
 * Validates that when a seller updates only the `optionValues` field of an existing variant, the entire option values set is fully replaced — old option values are removed and new ones are inserted, not partially merged. The test also verifies that the SKU code and price remain unchanged after an option-values-only update, and that stock quantity is unaffected.
 *
 * 1. Administrator registers and creates a product category.
 * 2. Seller registers, and the admin approves the seller.
 * 3. Seller creates a product under the category.
 * 4. Seller creates a variant with initial option values "Color: Red, Size: Small".
 * 5. Seller updates only the `optionValues` to "Color: Red, Size: Medium".
 * 6. Validates the updated variant: new option values fully present, old "Small" absent, SKU code and price unchanged, new option value IDs differ from originals confirming full replacement, stock quantity unaffected.
 */
export async function test_api_variant_update_option_values_replacement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 3. Admin approves seller
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: seller.id,
  });
  // 4. Admin creates category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  // 5. Seller creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_mall_category_id: category.id,
      },
    },
  );
  // 6. Seller creates variant with initial option values
  const skuCode = RandomGenerator.alphaNumeric(12);
  const initialOptionValues = [
    { key: "Color", value: "Red" },
    { key: "Size", value: "Small" },
  ] satisfies IShoppingMallProductVariantOptionValue.ICreate[];
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          code: skuCode,
          optionValues: initialOptionValues,
        },
      },
    );
  typia.assert(variant);
  // 7. Update variant — replace option values entirely
  const newOptionValues = [
    { key: "Color", value: "Red" },
    { key: "Size", value: "Medium" },
  ] satisfies IShoppingMallProductVariantOptionValue.ICreate[];
  const updatedVariant =
    await api.functional.shoppingMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          optionValues: newOptionValues,
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // 8. Validate
  TestValidator.equals("SKU code unchanged", updatedVariant.code, variant.code);
  TestValidator.equals("price unchanged", updatedVariant.price, variant.price);
  TestValidator.equals(
    "base_price unchanged",
    updatedVariant.base_price,
    variant.base_price,
  );
  TestValidator.equals(
    "stock_quantity unaffected",
    updatedVariant.stock_quantity,
    0,
  );
  TestValidator.equals(
    "option values count matches new set",
    updatedVariant.optionValues.length,
    2,
  );
  // Verify full replacement: old "Small" is absent, new "Medium" is present
  const hasMedium = updatedVariant.optionValues.some(
    (ov) => ov.key === "Size" && ov.value === "Medium",
  );
  const hasSmall = updatedVariant.optionValues.some(
    (ov) => ov.key === "Size" && ov.value === "Small",
  );
  TestValidator.predicate("new option value 'Size: Medium' present", hasMedium);
  TestValidator.predicate("old option value 'Size: Small' removed", !hasSmall);
  // Verify full replacement created new records (IDs differ from originals)
  const originalIds = new Set(variant.optionValues.map((ov) => ov.id));
  const anyOldIdRetained = updatedVariant.optionValues.some((ov) =>
    originalIds.has(ov.id),
  );
  TestValidator.predicate(
    "all option value IDs are new (full replacement)",
    !anyOldIdRetained,
  );
}
