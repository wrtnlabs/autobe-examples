import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategorySnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategorySnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_categories_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";

export async function test_api_category_snapshot_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register administrator account using utility function
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
  // 2. Create initial category using generation utility
  const category =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
        },
      },
    );
  typia.assert(category);
  // 3. Update category multiple times to create snapshots with time intervals
  const update1 =
    await api.functional.shoppingMall.administrator.categories.update(
      adminConnection,
      {
        categoryId: category.id,
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies IShoppingMallCategory.IUpdate,
      },
    );
  typia.assert(update1);
  // Wait briefly to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  const update2 =
    await api.functional.shoppingMall.administrator.categories.update(
      adminConnection,
      {
        categoryId: category.id,
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies IShoppingMallCategory.IUpdate,
      },
    );
  typia.assert(update2);
  await new Promise((resolve) => setTimeout(resolve, 100));
  const update3 =
    await api.functional.shoppingMall.administrator.categories.update(
      adminConnection,
      {
        categoryId: category.id,
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies IShoppingMallCategory.IUpdate,
      },
    );
  typia.assert(update3);
  // 4. Get all snapshots in ascending order to establish baseline
  const allSnapshots =
    await api.functional.shoppingMall.administrator.categories.snapshots.index(
      adminConnection,
      {
        categoryId: category.id,
        body: {
          sortBy: "created_at_asc",
        } satisfies IShoppingMallCategorySnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  // Verify we have snapshots (at least 3 from the updates)
  TestValidator.predicate("has snapshots", allSnapshots.data.length >= 3);
  // 5. Test date range filtering - get snapshots after middle timestamp
  const firstSnapshotTime = allSnapshots.data[0]?.created_at ?? "";
  const lastSnapshotTime =
    allSnapshots.data[allSnapshots.data.length - 1]?.created_at ?? "";
  const firstDate = new Date(firstSnapshotTime);
  const lastDate = new Date(lastSnapshotTime);
  const middleDate = new Date(
    firstDate.getTime() + (lastDate.getTime() - firstDate.getTime()) / 2,
  );
  const afterMiddleDate = new Date(middleDate.getTime() + 1000);
  const filteredSnapshots =
    await api.functional.shoppingMall.administrator.categories.snapshots.index(
      adminConnection,
      {
        categoryId: category.id,
        body: {
          createdAfter: middleDate.toISOString(),
          sortBy: "created_at_asc",
        } satisfies IShoppingMallCategorySnapshot.IRequest,
      },
    );
  typia.assert(filteredSnapshots);
  // Verify all returned snapshots are after the createdAfter timestamp
  for (const snapshot of filteredSnapshots.data) {
    TestValidator.predicate(
      "snapshot after createdAfter",
      new Date(snapshot.created_at) > middleDate,
    );
  }
  // 6. Test createdBefore filter
  const beforeFilteredSnapshots =
    await api.functional.shoppingMall.administrator.categories.snapshots.index(
      adminConnection,
      {
        categoryId: category.id,
        body: {
          createdBefore: afterMiddleDate.toISOString(),
          sortBy: "created_at_asc",
        } satisfies IShoppingMallCategorySnapshot.IRequest,
      },
    );
  typia.assert(beforeFilteredSnapshots);
  // Verify all returned snapshots are before the createdBefore timestamp
  for (const snapshot of beforeFilteredSnapshots.data) {
    TestValidator.predicate(
      "snapshot before createdBefore",
      new Date(snapshot.created_at) < afterMiddleDate,
    );
  }
  // 7. Test combined date range filter
  const rangeFilteredSnapshots =
    await api.functional.shoppingMall.administrator.categories.snapshots.index(
      adminConnection,
      {
        categoryId: category.id,
        body: {
          createdAfter: middleDate.toISOString(),
          createdBefore: lastDate.toISOString(),
          sortBy: "created_at_asc",
        } satisfies IShoppingMallCategorySnapshot.IRequest,
      },
    );
  typia.assert(rangeFilteredSnapshots);
  // Verify all snapshots are within the date range
  for (const snapshot of rangeFilteredSnapshots.data) {
    TestValidator.predicate(
      "snapshot within date range",
      new Date(snapshot.created_at) > middleDate &&
        new Date(snapshot.created_at) < lastDate,
    );
  }
  // 8. Test ascending sort order
  const ascendingSnapshots =
    await api.functional.shoppingMall.administrator.categories.snapshots.index(
      adminConnection,
      {
        categoryId: category.id,
        body: {
          sortBy: "created_at_asc",
        } satisfies IShoppingMallCategorySnapshot.IRequest,
      },
    );
  typia.assert(ascendingSnapshots);
  // Verify ascending order
  for (let i = 1; i < ascendingSnapshots.data.length; i++) {
    TestValidator.predicate(
      "ascending order",
      new Date(ascendingSnapshots.data[i]!.created_at) >=
        new Date(ascendingSnapshots.data[i - 1]!.created_at),
    );
  }
  // 9. Test descending sort order
  const descendingSnapshots =
    await api.functional.shoppingMall.administrator.categories.snapshots.index(
      adminConnection,
      {
        categoryId: category.id,
        body: {
          sortBy: "created_at_desc",
        } satisfies IShoppingMallCategorySnapshot.IRequest,
      },
    );
  typia.assert(descendingSnapshots);
  // Verify descending order
  for (let i = 1; i < descendingSnapshots.data.length; i++) {
    TestValidator.predicate(
      "descending order",
      new Date(descendingSnapshots.data[i]!.created_at) <=
        new Date(descendingSnapshots.data[i - 1]!.created_at),
    );
  }
  // 10. Test pagination with limit
  const limitedSnapshots =
    await api.functional.shoppingMall.administrator.categories.snapshots.index(
      adminConnection,
      {
        categoryId: category.id,
        body: {
          limit: 2,
          page: 1,
          sortBy: "created_at_asc",
        } satisfies IShoppingMallCategorySnapshot.IRequest,
      },
    );
  typia.assert(limitedSnapshots);
  // Verify limit is respected
  TestValidator.predicate("limit respected", limitedSnapshots.data.length <= 2);
  TestValidator.equals("page limit", limitedSnapshots.pagination.limit, 2);
  // 11. Test empty result set with impossible date range (future date)
  const emptySnapshots =
    await api.functional.shoppingMall.administrator.categories.snapshots.index(
      adminConnection,
      {
        categoryId: category.id,
        body: {
          createdAfter: new Date().toISOString(),
          sortBy: "created_at_asc",
        } satisfies IShoppingMallCategorySnapshot.IRequest,
      },
    );
  typia.assert(emptySnapshots);
  // Verify empty result for future date
  TestValidator.equals("empty result", emptySnapshots.data.length, 0);
}
