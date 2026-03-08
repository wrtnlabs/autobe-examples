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
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

export async function test_api_product_snapshot_history_owner_access(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test a seller viewing the complete snapshot history for their own product
   * after multiple edits.
   *
   * Prerequisites:
   * 1. Seller creates an account and logs in
   * 2. Seller creates a product with name, description, category, and base price
   * 3. Seller edits the product multiple times - each edit creates a snapshot
   *
   * Test Execution:
   * 1. Call GET /shoppingMall/seller/products/{productId}/snapshots
   * 2. Verify snapshots are sorted by created_at descending (newest first)
   * 3. Verify each snapshot has required fields
   * 4. Verify pagination metadata is present
   * 5. Verify snapshot count matches number of edits
   */
  // 1. Seller setup - create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 2. Create a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // Store initial product state for comparison
  const initialName = product.name;
  const initialDescription = product.description;
  const initialBasePrice = product.base_price;
  // 3. Edit the product 3 times to create 3 snapshots
  const editNames = [
    RandomGenerator.name(),
    RandomGenerator.name(),
    RandomGenerator.name(),
  ];
  // First edit
  const updated1 = await api.functional.shoppingMall.seller.products.update(
    sellerConnection,
    {
      productId: product.id,
      body: {
        name: editNames[0],
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<number & tags.Minimum<1000>>(),
      } satisfies IShoppingMallProduct.IUpdate,
    },
  );
  typia.assert(updated1);
  // Second edit
  const updated2 = await api.functional.shoppingMall.seller.products.update(
    sellerConnection,
    {
      productId: product.id,
      body: {
        name: editNames[1],
        description: RandomGenerator.paragraph({ sentences: 4 }),
        base_price: typia.random<number & tags.Minimum<1000>>(),
      } satisfies IShoppingMallProduct.IUpdate,
    },
  );
  typia.assert(updated2);
  // Third edit
  const updated3 = await api.functional.shoppingMall.seller.products.update(
    sellerConnection,
    {
      productId: product.id,
      body: {
        name: editNames[2],
        description: RandomGenerator.paragraph({ sentences: 5 }),
        base_price: typia.random<number & tags.Minimum<1000>>(),
      } satisfies IShoppingMallProduct.IUpdate,
    },
  );
  typia.assert(updated3);
  // 4. Retrieve snapshot history
  const snapshotHistory =
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
  typia.assert(snapshotHistory);
  // 5. Verify pagination metadata exists
  TestValidator.predicate(
    "pagination exists",
    () => snapshotHistory.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is 1",
    () => snapshotHistory.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit is set",
    () => snapshotHistory.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count is 3",
    () => snapshotHistory.pagination.records === 3,
  );
  TestValidator.predicate(
    "pages count is valid",
    () => snapshotHistory.pagination.pages >= 1,
  );
  // 6. Verify snapshot count matches number of edits
  TestValidator.equals(
    "snapshot count matches edits",
    snapshotHistory.data.length,
    3,
  );
  // 7. Verify snapshots are sorted by created_at descending (newest first)
  for (let i = 0; i < snapshotHistory.data.length - 1; i++) {
    const current = snapshotHistory.data[i];
    const next = snapshotHistory.data[i + 1];
    TestValidator.predicate(
      `snapshots sorted descending at index ${i}`,
      new Date(current.created_at).getTime() >=
        new Date(next.created_at).getTime(),
    );
  }
  // 8. Verify each snapshot has required fields
  for (const snapshot of snapshotHistory.data) {
    TestValidator.predicate("snapshot has id", () => snapshot.id !== undefined);
    TestValidator.predicate(
      "snapshot has name",
      () => snapshot.name !== undefined,
    );
    TestValidator.predicate(
      "snapshot has description",
      () => snapshot.description !== undefined,
    );
    TestValidator.predicate(
      "snapshot has base_price",
      () => snapshot.base_price !== undefined,
    );
    TestValidator.predicate(
      "snapshot has created_at",
      () => snapshot.created_at !== undefined,
    );
    TestValidator.predicate(
      "snapshot has variantCount",
      () => snapshot.variantCount >= 0,
    );
    // thumbnail can be null if no images were captured
  }
  // 9. Verify first snapshot captured initial state (before first edit)
  const oldestSnapshot = snapshotHistory.data[snapshotHistory.data.length - 1];
  TestValidator.equals(
    "oldest snapshot has initial name",
    oldestSnapshot.name,
    initialName,
  );
  TestValidator.equals(
    "oldest snapshot has initial description",
    oldestSnapshot.description,
    initialDescription,
  );
  TestValidator.equals(
    "oldest snapshot has initial base_price",
    oldestSnapshot.base_price,
    initialBasePrice,
  );
  // 10. Verify newest snapshot captured state after second edit (before third edit)
  const newestSnapshot = snapshotHistory.data[0];
  TestValidator.equals(
    "newest snapshot has edit 2 name",
    newestSnapshot.name,
    editNames[1],
  );
}
