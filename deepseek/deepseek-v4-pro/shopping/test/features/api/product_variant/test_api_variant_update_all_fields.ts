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
 * Test updating all mutable fields of a product variant including SKU code, option values, and price override.
 *
 * Validates the complete variant update workflow through the seller endpoint. The test establishes the prerequisite infrastructure — an administrator creates a category and approves a seller, then the seller creates a product and an initial variant with randomized attributes.
 *
 * The update operation changes every mutable field: a new globally unique SKU code, a completely different set of option key-value pairs ("material: Leather", "style: Modern"), and a price override set above the product's base price. After the update, the test validates that the response reflects all changes while confirming that computed fields behave correctly — stock_quantity is preserved unchanged (managed through inventory records, not editable via this endpoint), created_at remains immutable, and updated_at advances to reflect the modification.
 *
 * 1. Administrator registers and authenticates.
 * 2. Seller registers and authenticates.
 * 3. Administrator approves the seller's pending registration.
 * 4. Administrator creates a product category.
 * 5. Seller creates a product under the approved category.
 * 6. Seller creates an initial variant with randomized attributes.
 * 7. Seller updates the variant: new SKU code, new option values, and a higher price override.
 * 8. Validates updated code, new option values, new price, unchanged stock, and timestamp behavior.
 */
export async function test_api_variant_update_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  // 2. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 3. Administrator approves the seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: seller.id,
    });
  typia.assert(approvedSeller);
  // 4. Administrator creates a product category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 5. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_mall_category_id: category.id,
      },
    },
  );
  typia.assert(product);
  // 6. Seller creates an initial variant
  const initialVariant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(initialVariant);
  // Capture initial state for comparison
  const originalCode = initialVariant.code;
  const originalPrice = initialVariant.price;
  const originalStockQuantity = initialVariant.stock_quantity;
  const originalCreatedAt = initialVariant.created_at;
  const originalUpdatedAt = initialVariant.updated_at;
  // 7. Update variant with all new values
  const newCode = `SKU-UPD-${RandomGenerator.alphaNumeric(12)}`;
  const newPrice = product.base_price + 1000;
  const updatedVariant =
    await api.functional.shoppingMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: initialVariant.id,
        body: {
          code: newCode,
          optionValues: [
            { key: "material", value: "Leather" },
            { key: "style", value: "Modern" },
          ] satisfies IShoppingMallProductVariantOptionValue.ICreate[],
          price: newPrice,
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // 8. Validate updated fields
  TestValidator.equals("updated SKU code", updatedVariant.code, newCode);
  TestValidator.notEquals(
    "SKU code changed from original",
    updatedVariant.code,
    originalCode,
  );
  TestValidator.equals(
    "option values count",
    updatedVariant.optionValues.length,
    2,
  );
  TestValidator.predicate("option values contain new keys", () => {
    const keys = updatedVariant.optionValues.map((v) => v.key);
    return keys.includes("material") && keys.includes("style");
  });
  TestValidator.equals(
    "price override updated",
    updatedVariant.price,
    newPrice,
  );
  // 9. Validate computed and immutable fields
  TestValidator.equals(
    "stock quantity unchanged",
    updatedVariant.stock_quantity,
    originalStockQuantity,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedVariant.created_at,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "updated_at advanced",
    updatedVariant.updated_at > originalUpdatedAt,
  );
}
