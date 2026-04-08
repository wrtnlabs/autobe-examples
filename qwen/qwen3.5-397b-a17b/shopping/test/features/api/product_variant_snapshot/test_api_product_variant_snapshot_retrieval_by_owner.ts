import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IPageIShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariantSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
 * Test that a seller can successfully retrieve a variant snapshot from their own product after editing a variant.
 *
 * Validates the complete variant snapshot retrieval workflow including seller authentication, product creation, variant creation and editing, snapshot generation, and variant snapshot retrieval. Ensures that the variant snapshot preserves the historical state of the variant before the edit occurred.
 *
 * Special attention is given to verifying that the skuCode, optionValues, and price in the snapshot match the values BEFORE the edit, confirming the immutable audit trail functionality. The productSnapshot and productVariant relations are also validated to ensure proper hierarchy navigation.
 *
 * 1. Seller registers and authenticates using authorize_seller_join utility.
 * 2. Seller creates a product with category using generate_random_shopping_mall_seller_products_create utility.
 * 3. Seller creates a variant with initial SKU code, option values, and price using generate_random_shopping_mall_seller_products_variants_create utility.
 * 4. Seller edits the variant (changes SKU code, option values, and price) which triggers automatic snapshot creation.
 * 5. Seller retrieves product snapshots list to obtain the snapshotId.
 * 6. Seller retrieves variant snapshots list to obtain the variantSnapshotId.
 * 7. Seller retrieves the specific variant snapshot by ID.
 * 8. Validates that snapshot contains preserved historical state matching pre-edit values.
 */
export async function test_api_product_variant_snapshot_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 2. Create a product with category
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create initial variant with specific values to track
  const initialSkuCode = `SKU-${RandomGenerator.alphaNumeric(8)}`;
  const initialOptionValues = `Color: ${RandomGenerator.pick(["Red", "Blue", "Green"] as const)}, Size: ${RandomGenerator.pick(["S", "M", "L"] as const)}`;
  const initialPrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000>
  >();
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: initialSkuCode,
          option_values: initialOptionValues,
          price: initialPrice,
        },
      },
    );
  typia.assert(variant);
  // 4. Edit the variant to trigger snapshot creation
  const updatedSkuCode = `SKU-UPDATED-${RandomGenerator.alphaNumeric(8)}`;
  const updatedOptionValues = `Color: ${RandomGenerator.pick(["Yellow", "Purple", "Orange"] as const)}, Size: ${RandomGenerator.pick(["XL", "XXL"] as const)}`;
  const updatedPrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<2000>
  >();
  const updatedVariant =
    await api.functional.shoppingMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          sku_code: updatedSkuCode,
          option_values: updatedOptionValues,
          price: updatedPrice,
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // 5. Retrieve product snapshots to get snapshotId
  const snapshotsResponse =
    await api.functional.shoppingMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponse);
  TestValidator.predicate(
    "at least one snapshot exists",
    () => snapshotsResponse.data.length > 0,
  );
  const snapshot = snapshotsResponse.data[0];
  const snapshotId = snapshot.id;
  // 6. Retrieve variant snapshots list to get variantSnapshotId
  const variantSnapshotsResponse =
    await api.functional.shoppingMall.seller.productSnapshots.variantSnapshots.index(
      sellerConnection,
      {
        productSnapshotId: snapshotId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(variantSnapshotsResponse);
  TestValidator.predicate(
    "at least one variant snapshot exists",
    () => variantSnapshotsResponse.data.length > 0,
  );
  const variantSnapshotSummary = variantSnapshotsResponse.data[0];
  const variantSnapshotId = variantSnapshotSummary.id;
  // 7. Retrieve the specific variant snapshot by ID
  const variantSnapshot =
    await api.functional.shoppingMall.seller.products.snapshots.variant_snapshots.at(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: snapshotId,
        variantSnapshotId: variantSnapshotId,
      },
    );
  typia.assert(variantSnapshot);
  // 8. Validate variant snapshot contains preserved historical state
  TestValidator.equals(
    "skuCode matches pre-edit value",
    variantSnapshot.skuCode,
    initialSkuCode,
  );
  TestValidator.equals(
    "optionValues matches pre-edit value",
    variantSnapshot.optionValues,
    initialOptionValues,
  );
  TestValidator.equals(
    "price matches pre-edit value",
    variantSnapshot.price,
    initialPrice,
  );
  // Validate snapshot structure
  TestValidator.predicate(
    "variant snapshot has valid id",
    () => variantSnapshot.id !== undefined,
  );
  TestValidator.predicate(
    "stockQuantity is non-negative",
    () => variantSnapshot.stockQuantity >= 0,
  );
  TestValidator.predicate("createdAt is valid date-time", () => {
    const date = new Date(variantSnapshot.createdAt);
    return !isNaN(date.getTime());
  });
  // Validate relations
  TestValidator.equals(
    "productSnapshot id matches",
    variantSnapshot.productSnapshot.id,
    snapshotId,
  );
  TestValidator.equals(
    "productVariant id matches",
    variantSnapshot.productVariant.id,
    variant.id,
  );
  TestValidator.equals(
    "productSnapshot name matches product",
    variantSnapshot.productSnapshot.name,
    product.name,
  );
  TestValidator.equals(
    "productSnapshot base_price matches product",
    variantSnapshot.productSnapshot.base_price,
    product.base_price,
  );
}
