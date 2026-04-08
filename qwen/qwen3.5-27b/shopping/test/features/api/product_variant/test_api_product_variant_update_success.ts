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
 * Test the primary success path for updating a product variant.
 *
 * Validates the complete variant update workflow including seller authentication, product creation, variant creation, and variant modification. Ensures that the variant is successfully updated with new SKU code, price, and variant options, and that the updated_at timestamp is refreshed.
 *
 * Special attention is given to verifying that the variant options are synchronized correctly (old options deleted, new options inserted) and that the response returns the complete updated variant entity with all fields.
 *
 * 1. Seller registers and authenticates via authorize_seller_join utility.
 * 2. Seller creates a product using generate_random_shopping_mall_seller_products_create utility.
 * 3. Seller creates a variant with initial SKU code, price, and options using generate_random_shopping_mall_seller_products_variants_create utility.
 * 4. Seller updates the variant with new SKU code, new price, and new variant options.
 * 5. Validates the updated variant response with typia.assert.
 * 6. Verifies business logic: updated_at differs from created_at, new values match input.
 */
export async function test_api_product_variant_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Create a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create a variant with initial values
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {},
      },
    );
  typia.assert(variant);
  // Store original created_at for comparison
  const originalCreatedAt: string = variant.created_at;
  const originalUpdatedAt: string = variant.updated_at;
  // 4. Prepare update payload with new values
  const updateBody = {
    sku_code: `UPDATED-${RandomGenerator.alphaNumeric(8)}`,
    price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1000>>(),
    variantOptions: ArrayUtil.repeat(2, (index: number) => ({
      key: `option_${index}`,
      value: RandomGenerator.alphabets(5),
    })),
  } satisfies IShoppingMallProductVariant.IUpdate;
  // 5. Update the variant
  const updatedVariant =
    await api.functional.shoppingMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: updateBody,
      },
    );
  typia.assert(updatedVariant);
  // 6. Validate business logic
  TestValidator.equals("variant id unchanged", updatedVariant.id, variant.id);
  TestValidator.equals(
    "sku_code updated",
    updatedVariant.sku_code,
    updateBody.sku_code,
  );
  TestValidator.equals("price updated", updatedVariant.price, updateBody.price);
  TestValidator.equals(
    "options updated",
    updatedVariant.options,
    updateBody.variantOptions,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedVariant.created_at,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at refreshed",
    updatedVariant.updated_at,
    originalUpdatedAt,
  );
  TestValidator.predicate(
    "updated_at is after created_at",
    updatedVariant.updated_at > updatedVariant.created_at,
  );
}
