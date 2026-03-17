import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
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
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test that a seller can retrieve their own product's snapshot history.
 *
 * Workflow:
 * 1. Seller registers via join endpoint
 * 2. Seller creates initial product
 * 3. First update: modify name and basePrice (creates snapshot capturing initial state)
 * 4. Second update: modify description (creates snapshot capturing state after first update)
 * 5. Retrieve and validate snapshot history
 *
 * Note: Snapshots capture state BEFORE each update is applied.
 */
export async function test_api_product_snapshot_seller_own_product_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Create initial product
  const initialName = RandomGenerator.name();
  const initialDescription = RandomGenerator.paragraph({ sentences: 3 });
  const initialBasePrice = typia.random<
    number & tags.Minimum<1000> & tags.Maximum<100000>
  >();
  const initialProduct =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          name: initialName,
          description: initialDescription,
          basePrice: initialBasePrice,
          categoryId: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(initialProduct);
  const productId = initialProduct.id;
  // 3. First product update - modify name and basePrice
  // This creates Snapshot #1 capturing initial state
  const updatedName = initialName + " Updated";
  const updatedBasePrice = initialBasePrice + 5000;
  const firstUpdate = await api.functional.shoppingMall.seller.products.update(
    sellerConnection,
    {
      productId,
      body: {
        name: updatedName,
        base_price: updatedBasePrice,
      } satisfies IShoppingMallProduct.IUpdate,
    },
  );
  typia.assert(firstUpdate);
  // 4. Second product update - modify description
  // This creates Snapshot #2 capturing state after first update
  const updatedDescription = RandomGenerator.paragraph({ sentences: 5 });
  const secondUpdate = await api.functional.shoppingMall.seller.products.update(
    sellerConnection,
    {
      productId,
      body: {
        description: updatedDescription,
      } satisfies IShoppingMallProduct.IUpdate,
    },
  );
  typia.assert(secondUpdate);
  // 5. Retrieve snapshot history
  const snapshotHistory =
    await api.functional.shoppingMall.products.snapshots.index(
      sellerConnection,
      {
        productId,
        body: {} satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(snapshotHistory);
  // Validations
  TestValidator.equals(
    "pagination contains 2 snapshots",
    snapshotHistory.data.length,
    2,
  );
  TestValidator.equals(
    "total records is 2",
    snapshotHistory.pagination.records,
    2,
  );
  TestValidator.predicate(
    "ordered descending by createdAt",
    new Date(snapshotHistory.data[0].createdAt).getTime() >=
      new Date(snapshotHistory.data[1].createdAt).getTime(),
  );
  // Snapshot #2 (newer) - created before second update, captures state after first update
  // Contains: updated name, updated basePrice, INITIAL description
  const newerSnapshot = snapshotHistory.data[0];
  TestValidator.equals(
    "newer snapshot has updated name",
    newerSnapshot.name,
    updatedName,
  );
  TestValidator.equals(
    "newer snapshot has updated basePrice",
    newerSnapshot.basePrice,
    updatedBasePrice,
  );
  TestValidator.equals(
    "newer snapshot has initial description",
    newerSnapshot.description,
    initialDescription,
  );
  TestValidator.predicate(
    "newer snapshot has images array",
    Array.isArray(newerSnapshot.images),
  );
  TestValidator.predicate(
    "newer snapshot has valid createdAt",
    newerSnapshot.createdAt.includes("T"),
  );
  TestValidator.predicate(
    "newer snapshot has variantCount >= 0",
    newerSnapshot.variantCount >= 0,
  );
  // Snapshot #1 (older) - created before first update, captures initial state
  // Contains: INITIAL name, INITIAL basePrice, INITIAL description
  const olderSnapshot = snapshotHistory.data[1];
  TestValidator.equals(
    "older snapshot has initial name",
    olderSnapshot.name,
    initialName,
  );
  TestValidator.equals(
    "older snapshot has initial basePrice",
    olderSnapshot.basePrice,
    initialBasePrice,
  );
  TestValidator.equals(
    "older snapshot has initial description",
    olderSnapshot.description,
    initialDescription,
  );
}
