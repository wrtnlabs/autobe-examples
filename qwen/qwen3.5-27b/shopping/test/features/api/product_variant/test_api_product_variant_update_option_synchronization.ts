import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test variant option synchronization behavior when updating a product variant.
 *
 * Validates the complete option replacement workflow including seller authentication, product creation, variant creation with initial options, and variant update with new options. Ensures that the variant options array is completely replaced with new options, including adding new option keys, modifying existing option values, and removing some options.
 *
 * Special attention is given to verifying that the response returns the variant with the complete updated options array and that the updated_at timestamp is refreshed. This test validates the option synchronization logic that ensures variant attributes are accurately maintained.
 *
 * 1. Register and authenticate a seller account.
 * 2. Create a product owned by the authenticated seller.
 * 3. Create a variant with initial options (e.g., color: Red, size: Small).
 * 4. Update the variant by replacing options (e.g., color: Blue, material: Cotton).
 * 5. Validate that the response contains the complete updated options array.
 * 6. Verify that the updated_at timestamp has been refreshed.
 */
export async function test_api_product_variant_update_option_synchronization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: undefined,
  });
  typia.assert(seller);
  // 2. Create a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: undefined,
    },
  );
  typia.assert(product);
  // 3. Create a variant with initial options (color: Red, size: Small)
  const initialOptions: IShoppingMallProductVariantOption[] = [
    { key: "color", value: "Red" },
    { key: "size", value: "Small" },
  ];
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price: 29900,
          variantOptions: initialOptions,
          initialStockQuantity: 10,
        },
      },
    );
  typia.assert(variant);
  // Store initial updated_at timestamp
  const initialUpdatedAt = variant.updated_at;
  // 4. Update the variant with new options (color: Blue, material: Cotton)
  // This replaces all options: removes "size", modifies "color", adds "material"
  const newOptions: IShoppingMallProductVariantOption[] = [
    { key: "color", value: "Blue" },
    { key: "material", value: "Cotton" },
  ];
  const updatedVariant =
    await api.functional.shoppingMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          variantOptions: newOptions,
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // 5. Validate that the response contains the complete updated options array
  TestValidator.equals("options count", updatedVariant.options.length, 2);
  // Validate that old options are removed
  const hasColorOption = updatedVariant.options.some(
    (opt) => opt.key === "color",
  );
  const hasMaterialOption = updatedVariant.options.some(
    (opt) => opt.key === "material",
  );
  const hasSizeOption = updatedVariant.options.some(
    (opt) => opt.key === "size",
  );
  TestValidator.predicate("has color option", hasColorOption);
  TestValidator.predicate("has material option", hasMaterialOption);
  TestValidator.predicate("size option removed", !hasSizeOption);
  // Validate option values
  const colorOption = updatedVariant.options.find((opt) => opt.key === "color");
  const materialOption = updatedVariant.options.find(
    (opt) => opt.key === "material",
  );
  TestValidator.equals("color value updated", colorOption?.value, "Blue");
  TestValidator.equals("material value added", materialOption?.value, "Cotton");
  // 6. Verify that the updated_at timestamp has been refreshed
  TestValidator.notEquals(
    "updated_at timestamp refreshed",
    initialUpdatedAt,
    updatedVariant.updated_at,
  );
  // Additional validation: ensure variant ID and SKU remain unchanged
  TestValidator.equals("variant id unchanged", updatedVariant.id, variant.id);
  TestValidator.equals(
    "sku code unchanged",
    updatedVariant.sku_code,
    variant.sku_code,
  );
}
