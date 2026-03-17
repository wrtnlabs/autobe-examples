import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IPageIShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariantSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistic";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
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
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

/**
 * Test that variant snapshots preserve immutable historical state even after the variant is modified multiple times.
 *
 * Workflow:
 * 1. Register seller account and get authenticated connection
 * 2. Create a product for the variant
 * 3. Create initial variant with specific options, price 100, stock 50
 * 4. Edit variant (triggers first product snapshot with variant snapshot)
 * 5. Edit variant again with different options, price 150, stock 30 (triggers second snapshot)
 * 6. List product snapshots to get the first snapshot ID
 * 7. List variant snapshots within first product snapshot to get variant snapshot ID
 * 8. Retrieve the specific variant snapshot
 * 9. Validate snapshot contains historical values from first edit, not current variant values
 *    This confirms snapshots are immutable point-in-time captures preserving historical accuracy
 */
export async function test_api_variant_snapshot_historical_state_preservation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create product (note: requires valid category - assuming test infrastructure provides this)
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: 100,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Create initial variant with specific values
  const initialVariant =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: "SKU-001-INITIAL",
          price: 100,
          stock_quantity: 50,
          options: [
            { key: "color", value: "Red" },
            { key: "size", value: "Large" },
          ] satisfies IShoppingMallProductVariantOption.ICreate[],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(initialVariant);
  TestValidator.equals(
    "initial SKU",
    initialVariant.skuCode,
    "SKU-001-INITIAL",
  );
  TestValidator.equals("initial price", initialVariant.price, 100);
  TestValidator.equals("initial stock", initialVariant.stockQuantity, 50);
  // 4. Edit variant first time (triggers first product snapshot)
  const firstEdit =
    await api.functional.shoppingMall.seller.sellers.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: initialVariant.id,
        body: {
          skuCode: "SKU-001-FIRST-EDIT",
          price: 120,
          stockQuantity: 45,
          optionValues: {
            color: "Red",
            size: "Large",
          },
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  typia.assert(firstEdit);
  TestValidator.equals(
    "first edit SKU",
    firstEdit.skuCode,
    "SKU-001-FIRST-EDIT",
  );
  TestValidator.equals("first edit price", firstEdit.price, 120);
  TestValidator.equals("first edit stock", firstEdit.stockQuantity, 45);
  // 5. Edit variant second time (triggers second product snapshot)
  const secondEdit =
    await api.functional.shoppingMall.seller.sellers.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: initialVariant.id,
        body: {
          skuCode: "SKU-002-SECOND-EDIT",
          price: 150,
          stockQuantity: 30,
          optionValues: {
            color: "Blue",
            size: "Medium",
          },
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  typia.assert(secondEdit);
  TestValidator.equals(
    "second edit SKU",
    secondEdit.skuCode,
    "SKU-002-SECOND-EDIT",
  );
  TestValidator.equals("second edit price", secondEdit.price, 150);
  TestValidator.equals("second edit stock", secondEdit.stockQuantity, 30);
  // 6. List product snapshots to get the first snapshot (earliest)
  const productSnapshots =
    await api.functional.shoppingMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 10,
          sort: "snapshot_at,asc",
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(productSnapshots);
  TestValidator.predicate(
    "has product snapshots",
    productSnapshots.data.length >= 1,
  );
  const firstSnapshot = productSnapshots.data[0];
  TestValidator.notEquals("first snapshot exists", firstSnapshot, undefined);
  // 7. List variant snapshots within the first product snapshot
  const variantSnapshots =
    await api.functional.shoppingMall.seller.products.snapshots.variantSnapshots.index(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: firstSnapshot.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(variantSnapshots);
  TestValidator.predicate(
    "has variant snapshots",
    variantSnapshots.data.length >= 1,
  );
  const variantSnapshot = variantSnapshots.data[0];
  TestValidator.notEquals(
    "variant snapshot exists",
    variantSnapshot,
    undefined,
  );
  // 8. Retrieve the specific variant snapshot by ID
  const specificVariantSnapshot =
    await api.functional.shoppingMall.seller.products.snapshots.variantSnapshots.at(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: firstSnapshot.id,
        variantSnapshotId: variantSnapshot.id,
      },
    );
  typia.assert(specificVariantSnapshot);
  // 9. Validate snapshot contains historical values from first edit (immutability test)
  TestValidator.equals(
    "snapshot SKU preserved",
    specificVariantSnapshot.sku_code,
    "SKU-001-FIRST-EDIT",
  );
  TestValidator.equals(
    "snapshot price preserved",
    specificVariantSnapshot.price,
    120,
  );
  TestValidator.equals(
    "snapshot stock preserved",
    specificVariantSnapshot.stock_quantity,
    45,
  );
  TestValidator.equals(
    "snapshot color option",
    specificVariantSnapshot.option_values.color,
    "Red",
  );
  TestValidator.equals(
    "snapshot size option",
    specificVariantSnapshot.option_values.size,
    "Large",
  );
  // Verify snapshot values differ from current variant values (proving immutability)
  TestValidator.notEquals(
    "snapshot SKU differs from current",
    specificVariantSnapshot.sku_code,
    secondEdit.skuCode,
  );
  TestValidator.notEquals(
    "snapshot price differs from current",
    specificVariantSnapshot.price,
    secondEdit.price,
  );
  TestValidator.notEquals(
    "snapshot stock differs from current",
    specificVariantSnapshot.stock_quantity,
    secondEdit.stockQuantity,
  );
}
