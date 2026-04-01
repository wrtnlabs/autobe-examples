import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IPageIShoppingMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshotVariant";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotVariant";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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
 * Test that a seller can successfully retrieve a variant snapshot from their own product's snapshot.
 *
 * Workflow:
 * 1. Authenticate as a seller
 * 2. Create a product with a variant
 * 3. Edit the product to trigger snapshot creation
 * 4. Retrieve product snapshots to get snapshotId
 * 5. Retrieve variant snapshots to get variantSnapshotId
 * 6. Call target endpoint to retrieve specific variant snapshot
 * 7. Verify response structure and data consistency with list endpoint
 */
export async function test_api_product_variant_snapshot_retrieval_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 2. Create a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create a variant for the product
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 4. Edit the product to trigger snapshot creation
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: product.id,
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IShoppingMallProduct.IUpdate,
    });
  typia.assert(updatedProduct);
  // 5. Retrieve product snapshots to get snapshotId
  const productSnapshots =
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
  typia.assert(productSnapshots);
  TestValidator.predicate(
    "has at least one snapshot",
    () => productSnapshots.data.length > 0,
  );
  const snapshot = productSnapshots.data[0];
  const snapshotId = snapshot.id;
  // 6. Retrieve variant snapshots to get variantSnapshotId
  const variantSnapshots =
    await api.functional.shoppingMall.seller.products.snapshots.variants.index(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: snapshotId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductSnapshotVariant.IRequest,
      },
    );
  typia.assert(variantSnapshots);
  TestValidator.predicate(
    "has at least one variant snapshot",
    () => variantSnapshots.data.length > 0,
  );
  const variantSnapshot = variantSnapshots.data[0];
  const variantSnapshotId = variantSnapshot.id;
  // 7. Call target endpoint to retrieve specific variant snapshot
  const retrievedVariantSnapshot =
    await api.functional.shoppingMall.seller.products.snapshots.variants.at(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: snapshotId,
        variantSnapshotId: variantSnapshotId,
      },
    );
  typia.assert(retrievedVariantSnapshot);
  // 8. Verify data consistency between at() and index() endpoints
  TestValidator.equals(
    "sku_code matches list",
    retrievedVariantSnapshot.sku_code,
    variantSnapshot.sku_code,
  );
  TestValidator.equals(
    "price_override matches list",
    retrievedVariantSnapshot.price_override,
    variantSnapshot.price_override,
  );
  TestValidator.equals(
    "stock_quantity matches list",
    retrievedVariantSnapshot.stock_quantity,
    variantSnapshot.stock_quantity,
  );
  TestValidator.equals(
    "created_at matches list",
    retrievedVariantSnapshot.created_at,
    variantSnapshot.created_at,
  );
  TestValidator.equals(
    "id matches list",
    retrievedVariantSnapshot.id,
    variantSnapshotId,
  );
}