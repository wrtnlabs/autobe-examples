import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistic";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
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
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test that a seller can successfully retrieve a snapshot of their own product.
 *
 * This test verifies the complete product snapshot retrieval workflow:
 * 1. Register a new seller account and authenticate
 * 2. Create a product with initial data
 * 3. Edit the product to trigger automatic snapshot creation
 * 4. List the product's snapshots to obtain the snapshotId
 * 5. Retrieve the specific snapshot using the snapshot ID
 * 6. Validate that the response contains complete product state including
 *    name, description, base price, category, seller info, variant snapshots
 *    with SKU codes, option values, prices, stock quantities, and snapshot timestamp
 */
export async function test_api_product_snapshot_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create a product with initial data
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number &
            tags.Type<"uint32"> &
            tags.Minimum<1000> &
            tags.Maximum<100000>
        >(),
      } satisfies Partial<IShoppingMallProduct.ICreate>,
    },
  );
  typia.assert(product);
  // 3. Edit the product to trigger snapshot creation
  const updatedName = RandomGenerator.paragraph({ sentences: 1 });
  const updatedPrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<100000>
  >();
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: product.id,
      body: {
        name: updatedName,
        basePrice: updatedPrice,
      } satisfies IShoppingMallProduct.IUpdate,
    });
  typia.assert(updatedProduct);
  // 4. List the product's snapshots to obtain snapshotId
  const snapshotsResponse =
    await api.functional.shoppingMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 10,
          sort: "snapshot_at,desc",
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponse);
  // Verify at least one snapshot was created
  TestValidator.predicate(
    "at least one snapshot exists",
    () => snapshotsResponse.data.length > 0,
  );
  // Get the most recent snapshot
  const snapshotSummary = snapshotsResponse.data[0];
  const snapshotId = snapshotSummary.id;
  // 5. Retrieve the specific snapshot using the snapshot ID
  const snapshot =
    await api.functional.shoppingMall.seller.products.snapshots.at(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // 6. Validate snapshot contains complete product state
  TestValidator.equals(
    "snapshot name matches updated name",
    snapshot.name,
    updatedName,
  );
  TestValidator.equals(
    "snapshot base_price matches updated price",
    snapshot.base_price,
    updatedPrice,
  );
  TestValidator.equals(
    "snapshot product id matches",
    snapshot.product.id,
    product.id,
  );
  TestValidator.equals(
    "snapshot seller id matches",
    snapshot.seller.id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "snapshot category id matches",
    snapshot.category.id,
    product.category.id,
  );
  // Validate snapshot timestamp exists and is valid
  TestValidator.predicate(
    "snapshot has valid timestamp",
    () =>
      snapshot.snapshot_at !== null &&
      snapshot.snapshot_at !== undefined &&
      new Date(snapshot.snapshot_at).getTime() > 0,
  );
  // Validate variant snapshots exist and contain required fields
  TestValidator.predicate(
    "snapshot has variant snapshots",
    () => snapshot.variantSnapshots.length > 0,
  );
  // Validate each variant snapshot has required fields
  for (const variantSnapshot of snapshot.variantSnapshots) {
    TestValidator.predicate(
      "variant snapshot has sku_code",
      () =>
        variantSnapshot.sku_code !== null &&
        variantSnapshot.sku_code !== undefined &&
        variantSnapshot.sku_code.length > 0,
    );
    TestValidator.predicate(
      "variant snapshot has option_values",
      () =>
        variantSnapshot.option_values !== null &&
        variantSnapshot.option_values !== undefined,
    );
    TestValidator.predicate(
      "variant snapshot has stock_quantity",
      () =>
        variantSnapshot.stock_quantity !== null &&
        variantSnapshot.stock_quantity !== undefined &&
        variantSnapshot.stock_quantity >= 0,
    );
    TestValidator.predicate(
      "variant snapshot has snapshot_at",
      () =>
        variantSnapshot.snapshot_at !== null &&
        variantSnapshot.snapshot_at !== undefined &&
        new Date(variantSnapshot.snapshot_at).getTime() > 0,
    );
  }
  // Validate images exist in snapshot
  TestValidator.predicate(
    "snapshot has images",
    () => snapshot.images !== null && snapshot.images !== undefined,
  );
}
