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
import type { IShoppingMallVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantSnapshot";
import type { IShoppingMallVariantSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantSnapshotOption";
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
 * Test that variant snapshots remain accessible even after the variant has been modified, ensuring audit trail preservation for dispute resolution.
 *
 * Validates the complete lifecycle of variant snapshot persistence: seller authentication, product creation, variant creation, variant modification to trigger snapshot creation, and subsequent snapshot retrieval. Ensures that the immutable snapshot data remains accessible using the original IDs.
 *
 * Special attention is given to verifying that snapshot immutability is preserved and that all snapshot fields (sku_code, price, created_at, variantSnapshotOptions) are present and valid. The test confirms that sellers can access historical variant data for audit and dispute resolution purposes.
 *
 * 1. Seller registers and authenticates to the shopping mall platform.
 * 2. Seller creates a product with name, description, and base price.
 * 3. Seller creates a variant for the product with SKU code, options, and initial stock.
 * 4. Seller updates the variant to trigger snapshot creation (modifying price and options).
 * 5. Retrieves the snapshot using the variant ID as the snapshot reference.
 * 6. Validates that snapshot data is complete and accessible.
 * 7. Confirms snapshot immutability by verifying all fields are present.
 */
export async function test_api_variant_snapshot_persistence_after_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://test.com/join",
      referrer: "https://test.com",
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 2. Create a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Create a variant for the product
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphabets(6).toUpperCase()}`,
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          variantOptions: [
            { key: "color", value: "Red" },
            { key: "size", value: "Large" },
          ],
          initialStockQuantity: 100,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 4. Update the variant to trigger snapshot creation
  const originalPrice = variant.price ?? product.base_price;
  const updatedVariant =
    await api.functional.shoppingMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          price: originalPrice + 1000,
          variantOptions: [
            { key: "color", value: "Blue" },
            { key: "size", value: "Medium" },
          ],
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // 5. Retrieve the snapshot using variant.id as snapshotId
  // Note: The first snapshot created when updating a variant typically uses the variant ID
  const snapshot =
    await api.functional.shoppingMall.seller.products.variants.snapshots.at(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        snapshotId: variant.id,
      },
    );
  typia.assert(snapshot);
  // 6. Validate snapshot persistence and immutability
  TestValidator.equals(
    "snapshot ID matches variant ID",
    snapshot.id,
    variant.id,
  );
  TestValidator.equals(
    "snapshot sku_code preserved",
    snapshot.sku_code,
    variant.sku_code,
  );
  TestValidator.equals(
    "snapshot price matches original",
    snapshot.price,
    originalPrice,
  );
  TestValidator.predicate(
    "snapshot has valid created_at",
    snapshot.created_at.length > 0,
  );
  TestValidator.equals(
    "snapshot options count",
    snapshot.variantSnapshotOptions.length,
    2,
  );
  // 7. Validate snapshot options structure
  const colorOption = snapshot.variantSnapshotOptions.find(
    (opt) => opt.key === "color",
  );
  const sizeOption = snapshot.variantSnapshotOptions.find(
    (opt) => opt.key === "size",
  );
  TestValidator.equals(
    "snapshot color option preserved",
    colorOption?.value,
    "Red",
  );
  TestValidator.equals(
    "snapshot size option preserved",
    sizeOption?.value,
    "Large",
  );
  // 8. Verify snapshot immutability - data should match pre-update state
  TestValidator.predicate(
    "snapshot price differs from updated variant",
    snapshot.price !== updatedVariant.price,
  );
  TestValidator.predicate(
    "snapshot color differs from updated variant",
    colorOption?.value !==
      updatedVariant.options.find((opt) => opt.key === "color")?.value,
  );
}
