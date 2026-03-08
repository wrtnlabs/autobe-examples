import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategorySnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCategorySnapshot";
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

export async function test_api_category_snapshots_audit_specific_category(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<
        string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
      >(),
      password: RandomGenerator.alphaNumeric(16) satisfies string &
        tags.MinLength<8> &
        tags.MaxLength<128>,
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create initial category (creates first snapshot automatically)
  const categoryName = RandomGenerator.name(2);
  const categoryDescription = RandomGenerator.paragraph({ sentences: 3 });
  const category = await api.functional.ecommerceMall.admin.categories.create(
    adminConnection,
    {
      body: {
        name: categoryName,
        description: categoryDescription,
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // Store category ID for snapshot filtering
  const categoryId: string & tags.Format<"uuid"> = category.id;
  // 3. Query snapshots for the specific category
  const snapshots =
    await api.functional.ecommerceMall.admin.category_snapshots.index(
      adminConnection,
      {
        body: {
          category_id: categoryId,
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallCategorySnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 4. Verify snapshot count - should have at least 1 (creation snapshot)
  TestValidator.predicate(
    "at least 1 snapshot exists",
    snapshots.data.length >= 1,
  );
  // 5. Verify all snapshots reference the correct category
  snapshots.data.forEach((snapshot, index) => {
    typia.assert(snapshot);
    TestValidator.equals(
      `snapshot ${index} category id matches`,
      snapshot.category.id,
      categoryId,
    );
    TestValidator.equals(
      `snapshot ${index} category name matches`,
      snapshot.category.name,
      categoryName,
    );
  });
  // 6. Verify admin reference in each snapshot
  snapshots.data.forEach((snapshot, index) => {
    typia.assert(snapshot);
    TestValidator.predicate(
      `snapshot ${index} has admin id`,
      snapshot.admin.id.length > 0,
    );
    TestValidator.predicate(
      `snapshot ${index} has admin email`,
      snapshot.admin.email.length > 0,
    );
    TestValidator.predicate(
      `snapshot ${index} has admin grade`,
      snapshot.admin.admin_grade.length > 0,
    );
  });
  // 7. Verify chronological order (descending by created_at)
  for (let i = 0; i < snapshots.data.length - 1; i++) {
    const current = snapshots.data[i];
    const next = snapshots.data[i + 1];
    TestValidator.predicate(
      `snapshot ${i} is newer than snapshot ${i + 1}`,
      new Date(current.created_at).getTime() >=
        new Date(next.created_at).getTime(),
    );
  }
  // 8. Verify pagination metadata
  TestValidator.predicate(
    "pagination current page is 1",
    snapshots.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    snapshots.pagination.limit > 0,
  );
  TestValidator.predicate(
    "total records match data length",
    snapshots.pagination.records === snapshots.data.length,
  );
}
