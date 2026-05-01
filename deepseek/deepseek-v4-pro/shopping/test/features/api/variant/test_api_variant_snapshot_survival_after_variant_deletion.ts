import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariantSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReview";
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
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";

/**
 * Test that variant snapshots remain accessible after the variant is deleted.
 *
 * Validates the business rule from Section 571 and 449: variant snapshots are preserved even after the variant itself is soft-deleted. The test confirms that the snapshot listing endpoint returns the pre-edit variant state captured in the snapshot, including the original SKU code, option values, and price.
 *
 * 1. Seller registers and authenticates via join.
 * 2. Seller creates a product to own the variant.
 * 3. Seller creates a variant with specific identifiable SKU code, option values, and price.
 * 4. Seller edits the variant by changing its SKU code, triggering a snapshot that captures the pre-edit state.
 * 5. Seller soft-deletes the variant.
 * 6. Seller queries variant snapshots using the deleted variant's product and variant IDs.
 * 7. Validates the snapshot exists with the original pre-edit SKU code, option values, and price, and that the variant reference is preserved.
 */
export async function test_api_variant_snapshot_survival_after_variant_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create a variant with specific identifiable data
  const originalSkuCode = RandomGenerator.alphaNumeric(16);
  const originalOptionKey = "color";
  const originalOptionValue = "Red";
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          code: originalSkuCode,
          optionValues: [
            { key: originalOptionKey, value: originalOptionValue },
          ],
          price: 15000,
        },
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(variant);
  // 4. Edit the variant to trigger snapshot creation (captures pre-edit state)
  const newSkuCode = RandomGenerator.alphaNumeric(16);
  const updatedVariant =
    await api.functional.shoppingMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          code: newSkuCode,
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // 5. Delete the variant
  await api.functional.shoppingMall.seller.products.variants.erase(
    sellerConnection,
    {
      productId: product.id,
      variantId: variant.id,
    },
  );
  // 6. Query variant snapshots after deletion
  const snapshotPage =
    await api.functional.shoppingMall.seller.products.variants.snapshots.patchByProductidAndVariantid(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {} satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(snapshotPage);
  // 7. Validate snapshot survival and content
  TestValidator.predicate(
    "snapshots exist after variant deletion",
    snapshotPage.data.length > 0,
  );
  const snapshot = snapshotPage.data[0];
  TestValidator.equals(
    "snapshot preserves original SKU code",
    snapshot.sku_code,
    originalSkuCode,
  );
  TestValidator.predicate(
    "snapshot preserves original option values",
    snapshot.option_values.includes(originalOptionKey) &&
      snapshot.option_values.includes(originalOptionValue),
  );
  TestValidator.equals(
    "snapshot preserves original price",
    snapshot.price,
    15000,
  );
  TestValidator.equals(
    "snapshot references the deleted variant",
    snapshot.variant.id,
    variant.id,
  );
}
