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

export async function test_api_category_snapshot_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator Setup - Register new administrator account
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
  // 2. Create initial category
  const initialCategory =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          parent_id: null,
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(initialCategory);
  // 3. Update category first time to generate snapshot
  const firstUpdate =
    await api.functional.shoppingMall.administrator.categories.update(
      adminConnection,
      {
        categoryId: initialCategory.id,
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies IShoppingMallCategory.IUpdate,
      },
    );
  typia.assert(firstUpdate);
  // Wait a small amount to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 10));
  // 4. Update category second time to generate another snapshot
  const secondUpdate =
    await api.functional.shoppingMall.administrator.categories.update(
      adminConnection,
      {
        categoryId: initialCategory.id,
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies IShoppingMallCategory.IUpdate,
      },
    );
  typia.assert(secondUpdate);
  // 5. Retrieve snapshot history
  const snapshotResponse =
    await api.functional.shoppingMall.administrator.categories.snapshots.index(
      adminConnection,
      {
        categoryId: initialCategory.id,
        body: {
          page: 1,
          limit: 20,
          sortBy: "created_at_desc",
        } satisfies IShoppingMallCategorySnapshot.IRequest,
      },
    );
  typia.assert(snapshotResponse);
  // 6. Validate pagination metadata
  TestValidator.equals("current page", snapshotResponse.pagination.current, 1);
  TestValidator.predicate(
    "limit is set",
    snapshotResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "total records > 0",
    snapshotResponse.pagination.records > 0,
  );
  TestValidator.predicate(
    "total pages > 0",
    snapshotResponse.pagination.pages > 0,
  );
  // 7. Validate snapshots array exists and has data
  TestValidator.predicate(
    "has at least 2 snapshots from updates",
    snapshotResponse.data.length >= 2,
  );
  // 8. Validate each snapshot structure (typia.assert validates types, test business logic)
  for (const snapshot of snapshotResponse.data) {
    TestValidator.predicate(
      "snapshot name is not empty",
      snapshot.name.length > 0,
    );
    TestValidator.predicate(
      "snapshot description is not empty",
      snapshot.description.length > 0,
    );
  }
  // 9. Verify snapshots are sorted by created_at descending (newest first)
  for (let i = 0; i < snapshotResponse.data.length - 1; i++) {
    const current = new Date(snapshotResponse.data[i].created_at).getTime();
    const next = new Date(snapshotResponse.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      `snapshot ${i} is newer than or equal to snapshot ${i + 1}`,
      current >= next,
    );
  }
  // 10. Verify the most recent snapshot matches the last update
  const latestSnapshot = snapshotResponse.data[0];
  TestValidator.equals(
    "latest snapshot name matches last update",
    latestSnapshot.name,
    secondUpdate.name,
  );
  TestValidator.equals(
    "latest snapshot description matches last update",
    latestSnapshot.description,
    secondUpdate.description,
  );
  TestValidator.equals(
    "latest snapshot parent_id matches category parent_id",
    latestSnapshot.parent_id,
    initialCategory.parent?.id ?? null,
  );
}
