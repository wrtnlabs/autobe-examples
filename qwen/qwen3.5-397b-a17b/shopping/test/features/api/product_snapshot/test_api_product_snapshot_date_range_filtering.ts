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
 * Test administrator's ability to filter product snapshots by creation date range for audit purposes.
 *
 * This test validates the date range filtering functionality for product snapshots:
 * 1. Creates administrator and seller accounts
 * 2. Creates a product and edits it multiple times to generate snapshots
 * 3. Tests filtering with created_at_from, created_at_to, and both parameters
 * 4. Validates empty results when date range doesn't match any snapshots
 */
export async function test_api_product_snapshot_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Setup: Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 3. Setup: Create initial product (generates first snapshot)
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Wait briefly and update product to create second snapshot
  await new Promise((resolve) => setTimeout(resolve, 100));
  const updatedProduct1 =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: product.id,
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IShoppingMallProduct.IUpdate,
    });
  typia.assert(updatedProduct1);
  // Wait briefly and update product again to create third snapshot
  await new Promise((resolve) => setTimeout(resolve, 100));
  const updatedProduct2 =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: product.id,
      body: {
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.IUpdate,
    });
  typia.assert(updatedProduct2);
  // 4. Retrieve all snapshots to get timestamps for filtering tests
  const allSnapshots =
    await api.functional.shoppingMall.administrator.products.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  // Verify we have at least 3 snapshots (initial + 2 updates)
  TestValidator.predicate(
    "at least 3 snapshots created",
    () => allSnapshots.data.length >= 3,
  );
  // Snapshots are returned in descending order by created_at
  const snapshotTimestamps = allSnapshots.data.map((s) => s.created_at);
  // 5. Test: Filter with created_at_from (snapshots on or after middle timestamp)
  const middleTimestamp = snapshotTimestamps[1];
  const fromFiltered =
    await api.functional.shoppingMall.administrator.products.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 100,
          created_at_from: middleTimestamp,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(fromFiltered);
  // Verify all returned snapshots have created_at >= middleTimestamp
  TestValidator.predicate(
    "from filter: all snapshots >= middle timestamp",
    () =>
      fromFiltered.data.every(
        (s) =>
          new Date(s.created_at).getTime() >=
          new Date(middleTimestamp).getTime(),
      ),
  );
  // 6. Test: Filter with created_at_to (snapshots on or before middle timestamp)
  const toFiltered =
    await api.functional.shoppingMall.administrator.products.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 100,
          created_at_to: middleTimestamp,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(toFiltered);
  // Verify all returned snapshots have created_at <= middleTimestamp
  TestValidator.predicate("to filter: all snapshots <= middle timestamp", () =>
    toFiltered.data.every(
      (s) =>
        new Date(s.created_at).getTime() <= new Date(middleTimestamp).getTime(),
    ),
  );
  // 7. Test: Filter with both created_at_from and created_at_to (range filter)
  const earliestTimestamp = snapshotTimestamps[snapshotTimestamps.length - 1];
  const rangeFiltered =
    await api.functional.shoppingMall.administrator.products.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 100,
          created_at_from: earliestTimestamp,
          created_at_to: middleTimestamp,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(rangeFiltered);
  // Verify all returned snapshots fall within the date range (inclusive)
  TestValidator.predicate("range filter: all snapshots within date range", () =>
    rangeFiltered.data.every(
      (s) =>
        new Date(s.created_at).getTime() >=
          new Date(earliestTimestamp).getTime() &&
        new Date(s.created_at).getTime() <= new Date(middleTimestamp).getTime(),
    ),
  );
  // 8. Test: Filter with date range that matches no snapshots (future dates)
  const futureDate = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 365,
  ).toISOString(); // 1 year in future
  const emptyFiltered =
    await api.functional.shoppingMall.administrator.products.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 100,
          created_at_from: futureDate,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(emptyFiltered);
  // Verify empty result set with correct pagination metadata
  TestValidator.equals(
    "empty result: data array is empty",
    emptyFiltered.data.length,
    0,
  );
  TestValidator.equals(
    "empty result: records count is 0",
    emptyFiltered.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result: pages count is 0",
    emptyFiltered.pagination.pages,
    0,
  );
  // 9. Test: Verify snapshots are in descending order by created_at
  TestValidator.predicate("snapshots ordered by created_at DESC", () => {
    for (let i = 1; i < allSnapshots.data.length; i++) {
      if (
        new Date(allSnapshots.data[i].created_at).getTime() >
        new Date(allSnapshots.data[i - 1].created_at).getTime()
      ) {
        return false;
      }
    }
    return true;
  });
}