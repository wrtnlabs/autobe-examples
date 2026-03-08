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

export async function test_api_category_snapshots_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create a test category to generate a snapshot
  const categoryInput = {
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IEcommerceMallCategory.ICreate;
  const category = await api.functional.ecommerceMall.admin.categories.create(
    adminConnection,
    { body: categoryInput },
  );
  typia.assert(category);
  // 3. Test filtering by specific categoryId
  const filteredSnapshots =
    await api.functional.ecommerceMall.admin.categorySnapshots.index(
      adminConnection,
      {
        body: {
          ecommerceMallCategoryId: category.id,
        } satisfies IEcommerceMallCategorySnapshot.IRequest,
      },
    );
  typia.assert(filteredSnapshots);
  TestValidator.equals(
    "filtered by categoryId returns correct count",
    filteredSnapshots.pagination.records,
    1,
  );
  TestValidator.equals(
    "filtered by categoryId returns data",
    filteredSnapshots.data.length,
    1,
  );
  // 4. Test filtering by date range
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const future = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dateRangeResult =
    await api.functional.ecommerceMall.admin.categorySnapshots.index(
      adminConnection,
      {
        body: {
          snapshotCreatedAtMin: yesterday.toISOString(),
          snapshotCreatedAtMax: future.toISOString(),
        } satisfies IEcommerceMallCategorySnapshot.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  TestValidator.predicate(
    "date range filtering works",
    dateRangeResult.pagination.records >= 1,
  );
  // 5. Test sorting by snapshotCreatedAt in descending order (default)
  const descendingResult =
    await api.functional.ecommerceMall.admin.categorySnapshots.index(
      adminConnection,
      {
        body: {
          sort: "snapshotCreatedAt",
          sortOrder: "descending",
        } satisfies IEcommerceMallCategorySnapshot.IRequest,
      },
    );
  typia.assert(descendingResult);
  TestValidator.equals(
    "descending sort returns correct count",
    descendingResult.pagination.records,
    dateRangeResult.pagination.records,
  );
  // 6. Test sorting by snapshotCreatedAt in ascending order
  const ascendingResult =
    await api.functional.ecommerceMall.admin.categorySnapshots.index(
      adminConnection,
      {
        body: {
          sort: "snapshotCreatedAt",
          sortOrder: "ascending",
        } satisfies IEcommerceMallCategorySnapshot.IRequest,
      },
    );
  typia.assert(ascendingResult);
  TestValidator.equals(
    "ascending sort returns correct count",
    ascendingResult.pagination.records,
    dateRangeResult.pagination.records,
  );
  // 7. Test pagination with default limit
  const defaultLimit =
    await api.functional.ecommerceMall.admin.categorySnapshots.index(
      adminConnection,
      {
        body: {
          limit: 20,
        } satisfies IEcommerceMallCategorySnapshot.IRequest,
      },
    );
  typia.assert(defaultLimit);
  TestValidator.predicate(
    "pagination with default limit",
    defaultLimit.pagination.limit === 20,
  );
  // 7b. Test pagination with max limit
  const maxLimit =
    await api.functional.ecommerceMall.admin.categorySnapshots.index(
      adminConnection,
      {
        body: {
          limit: 100,
        } satisfies IEcommerceMallCategorySnapshot.IRequest,
      },
    );
  typia.assert(maxLimit);
  TestValidator.predicate(
    "pagination with max limit",
    maxLimit.pagination.limit === 100,
  );
  // 8. Verify query joins with categories table - category name in summary
  const filteredByCategory =
    await api.functional.ecommerceMall.admin.categorySnapshots.index(
      adminConnection,
      {
        body: {
          ecommerceMallCategoryId: category.id,
        } satisfies IEcommerceMallCategorySnapshot.IRequest,
      },
    );
  typia.assert(filteredByCategory);
  TestValidator.equals(
    "category name in summary",
    filteredByCategory.data[0].name,
    category.name,
  );
  // 9. Validate empty results when no snapshots match (non-existent category)
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  const emptyResult =
    await api.functional.ecommerceMall.admin.categorySnapshots.index(
      adminConnection,
      {
        body: {
          ecommerceMallCategoryId: nonExistentId,
        } satisfies IEcommerceMallCategorySnapshot.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty results for non-existent category",
    emptyResult.pagination.records,
    0,
  );
}