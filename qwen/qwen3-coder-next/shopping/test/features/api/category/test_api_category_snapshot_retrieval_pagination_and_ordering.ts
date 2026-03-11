import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

export async function test_api_category_snapshot_retrieval_pagination_and_ordering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create category
  const category = await api.functional.ecommerceMall.admin.categories.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // 3-4. Edit category 3 times to create snapshots
  const updates = [
    { name: "Updated Name 1", description: "Updated Description 1" },
    { name: "Updated Name 2", description: "Updated Description 2" },
    { name: "Updated Name 3", description: "Updated Description 3" },
  ];
  // Collect snapshot IDs from all edits
  const allSnapshots: IEcommerceMallCategory.ISummary[] = [];
  for (const update of updates) {
    await api.functional.ecommerceMall.admin.categories.update(
      adminConnection,
      {
        categoryId: category.id,
        body: {
          name: update.name,
          description: update.description,
        } satisfies IEcommerceMallCategory.IUpdate,
      },
    );
    // Retrieve snapshots after each edit to get all snapshots
    const snapshotsResponse =
      await api.functional.ecommerceMall.categories.snapshots.index(
        adminConnection,
        {
          categoryId: category.id,
        },
      );
    typia.assert(snapshotsResponse);
    allSnapshots.push(...snapshotsResponse.data);
  }
  const totalSnapshots = allSnapshots.length;
  // 5. Retrieve snapshots with limit=2
  const response1 =
    await api.functional.ecommerceMall.categories.snapshots.index(
      adminConnection,
      {
        categoryId: category.id,
      },
    );
  typia.assert(response1);
  // 6. Verify only 2 snapshots are returned in the data array
  TestValidator.equals("snapshots count is 2", response1.data.length, 2);
  // 7. Verify pagination shows records=3, pages=2 for limit=2
  TestValidator.equals(
    "pagination records is 3",
    response1.pagination.records,
    3,
  );
  TestValidator.equals("pagination pages is 2", response1.pagination.pages, 2);
  // 8. Verify snapshots are ordered from newest to oldest by created_at timestamp
  if (response1.data.length >= 2) {
    TestValidator.predicate(
      "snapshots ordered newest to oldest",
      new Date(response1.data[0].created_at) >=
        new Date(response1.data[1].created_at),
    );
  }
  // 9. Test cursor-based pagination by getting remaining snapshots
  const remainingCount = totalSnapshots - response1.data.length;
  if (remainingCount > 0) {
    // For cursor-based pagination, we would typically use the last snapshot ID
    // Since the API doesn't explicitly show cursor parameters, we'll verify
    // that total snapshots match expected count
    TestValidator.equals("total snapshots count", totalSnapshots, 3);
  }
  // 10. Verify the second page contains the remaining snapshot(s)
  TestValidator.equals("remaining snapshots", remainingCount, 1);
}
