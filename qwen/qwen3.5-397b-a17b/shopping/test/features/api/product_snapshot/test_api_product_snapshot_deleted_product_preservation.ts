import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test that product snapshots are preserved and accessible even after the product itself is deleted.
 * This validates the immutable audit trail requirement for dispute resolution and historical review.
 *
 * Workflow:
 * 1. Administrator and seller accounts are created and logged in
 * 2. Seller creates a product (generates initial snapshot)
 * 3. Seller edits product multiple times (generates additional snapshots)
 * 4. Administrator deletes the product
 * 5. Administrator retrieves snapshots for the deleted product
 * 6. Verify all snapshots remain accessible with intact historical data
 */
export async function test_api_product_snapshot_deleted_product_preservation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account with known credentials
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = await authorize_administrator_join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(adminJoin);
  // Login as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdministrator.ILogin,
  });
  // 2. Create seller account with known credentials
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoin = await authorize_seller_join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoin);
  // Login as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 3. Seller creates product (generates initial snapshot)
  const initialName = RandomGenerator.paragraph({ sentences: 2 });
  const initialPrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000>
  >();
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: initialName,
        description: RandomGenerator.content({ paragraphs: 2 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: initialPrice,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  const productId = product.id;
  const categoryId = product.category.id;
  // 4. Seller edits product multiple times to generate additional snapshots
  const updatedName = RandomGenerator.paragraph({ sentences: 2 });
  const updatedPrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000>
  >();
  const update1 = await api.functional.shoppingMall.seller.products.update(
    sellerConnection,
    {
      productId,
      body: {
        name: updatedName,
        base_price: updatedPrice,
      } satisfies IShoppingMallProduct.IUpdate,
    },
  );
  typia.assert(update1);
  const updatedDescription = RandomGenerator.content({ paragraphs: 3 });
  const update2 = await api.functional.shoppingMall.seller.products.update(
    sellerConnection,
    {
      productId,
      body: {
        description: updatedDescription,
      } satisfies IShoppingMallProduct.IUpdate,
    },
  );
  typia.assert(update2);
  // 5. Administrator deletes the product
  await api.functional.shoppingMall.administrator.products.erase(
    adminConnection,
    {
      productId,
    },
  );
  // 6. Administrator retrieves snapshots for the deleted product
  const snapshotsResponse =
    await api.functional.shoppingMall.administrator.products.snapshots.index(
      adminConnection,
      {
        productId,
        body: {
          page: 1,
          limit: 50,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponse);
  // 7. Validate snapshots are preserved after product deletion
  TestValidator.predicate("snapshots exist after product deletion", () => {
    return snapshotsResponse.data.length >= 3; // At least 3 snapshots: creation + 2 updates
  });
  TestValidator.predicate("snapshot count matches expected", () => {
    return snapshotsResponse.pagination.records >= 3;
  });
  // 8. Validate each snapshot has all required fields (typia.assert validates structure)
  for (const snapshot of snapshotsResponse.data) {
    typia.assert(snapshot);
    // Validate category reference remains accessible
    TestValidator.predicate("category reference is valid", () => {
      return (
        typeof snapshot.category.id === "string" &&
        typeof snapshot.category.name === "string" &&
        typeof snapshot.category.description === "string"
      );
    });
  }
  // 9. Validate at least one snapshot contains the initial product data (immutability check)
  const hasInitialSnapshot = snapshotsResponse.data.some(
    (snapshot) =>
      snapshot.name === initialName && snapshot.base_price === initialPrice,
  );
  TestValidator.predicate(
    "initial product state preserved in snapshot",
    () => hasInitialSnapshot,
  );
  // 10. Validate at least one snapshot contains the first update data
  const hasFirstUpdateSnapshot = snapshotsResponse.data.some(
    (snapshot) =>
      snapshot.name === updatedName && snapshot.base_price === updatedPrice,
  );
  TestValidator.predicate(
    "first update state preserved in snapshot",
    () => hasFirstUpdateSnapshot,
  );
  // 11. Validate snapshots are sorted by created_at descending (newest first)
  if (snapshotsResponse.data.length >= 2) {
    TestValidator.predicate("snapshots sorted by created_at descending", () => {
      for (let i = 0; i < snapshotsResponse.data.length - 1; i++) {
        const current = new Date(
          snapshotsResponse.data[i].created_at,
        ).getTime();
        const next = new Date(
          snapshotsResponse.data[i + 1].created_at,
        ).getTime();
        if (current < next) {
          return false;
        }
      }
      return true;
    });
  }
  // 12. Validate all snapshots reference the same category
  TestValidator.predicate("all snapshots reference same category", () => {
    const categoryIds = new Set(
      snapshotsResponse.data.map((s) => s.category.id),
    );
    return categoryIds.size === 1 && categoryIds.has(categoryId);
  });
}
