import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategorySnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCategorySnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_ecommerce_admin_categories_create } from "../../../generate/generate_random_ecommerce_admin_categories_create";
import { prepare_random_ecommerce_category } from "../../../prepare/prepare_random_ecommerce_category";

export async function test_api_category_snapshot_history_with_date_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create initial category
  const category = await generate_random_ecommerce_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IEcommerceCategory.ICreate,
    },
  );
  typia.assert(category);
  // 3. Create multiple snapshots by updating category with delays
  const snapshotCount = 5;
  const updates: IEcommerceCategory[] = [];
  for (let i = 0; i < snapshotCount; i++) {
    // Small delay to ensure distinct timestamps
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const updated = await api.functional.ecommerce.admin.categories.update(
      adminConnection,
      {
        categoryId: category.id,
        body: {
          name: `${RandomGenerator.name()} - Update ${i + 1}`,
          description: `Updated description ${i + 1}: ${RandomGenerator.paragraph({ sentences: 2 })}`,
        } satisfies IEcommerceCategory.IUpdate,
      },
    );
    typia.assert(updated);
    updates.push(updated);
  }
  // 4. Retrieve all snapshots without filters to establish baseline
  const allSnapshots =
    await api.functional.ecommerce.admin.categories.snapshots.index(
      adminConnection,
      {
        categoryId: category.id,
        body: {
          page: 1,
          limit: 100,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IEcommerceCategorySnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  // Validate we have snapshots
  TestValidator.predicate("has snapshots", allSnapshots.data.length > 0);
  // 5. Test date range filtering
  const earliestSnapshot = allSnapshots.data[allSnapshots.data.length - 1];
  const latestSnapshot = allSnapshots.data[0];
  // Filter to get only middle snapshots
  const middleIndex = Math.floor(allSnapshots.data.length / 2);
  const fromSnapshot = allSnapshots.data[middleIndex];
  const toSnapshot = allSnapshots.data[middleIndex + 2] || latestSnapshot;
  const filteredSnapshots =
    await api.functional.ecommerce.admin.categories.snapshots.index(
      adminConnection,
      {
        categoryId: category.id,
        body: {
          page: 1,
          limit: 100,
          created_at_from: fromSnapshot.created_at,
          created_at_to: toSnapshot.created_at,
          sort_by: "created_at",
          sort_order: "asc",
        } satisfies IEcommerceCategorySnapshot.IRequest,
      },
    );
  typia.assert(filteredSnapshots);
  // 6. Validate filtering results
  TestValidator.predicate(
    "filtered count matches pagination",
    filteredSnapshots.data.length === filteredSnapshots.pagination.records,
  );
  // Validate all filtered snapshots are within date range
  for (const snapshot of filteredSnapshots.data) {
    TestValidator.predicate(
      "snapshot within date range (from)",
      snapshot.created_at >= fromSnapshot.created_at,
    );
    TestValidator.predicate(
      "snapshot within date range (to)",
      snapshot.created_at <= toSnapshot.created_at,
    );
  }
  // 7. Test ascending sort order
  const ascSnapshots =
    await api.functional.ecommerce.admin.categories.snapshots.index(
      adminConnection,
      {
        categoryId: category.id,
        body: {
          page: 1,
          limit: 100,
          sort_by: "created_at",
          sort_order: "asc",
        } satisfies IEcommerceCategorySnapshot.IRequest,
      },
    );
  typia.assert(ascSnapshots);
  // Validate ascending order
  for (let i = 1; i < ascSnapshots.data.length; i++) {
    TestValidator.predicate(
      `ascending order check at index ${i}`,
      ascSnapshots.data[i - 1].created_at <= ascSnapshots.data[i].created_at,
    );
  }
  // 8. Test descending sort order
  const descSnapshots =
    await api.functional.ecommerce.admin.categories.snapshots.index(
      adminConnection,
      {
        categoryId: category.id,
        body: {
          page: 1,
          limit: 100,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IEcommerceCategorySnapshot.IRequest,
      },
    );
  typia.assert(descSnapshots);
  // Validate descending order
  for (let i = 1; i < descSnapshots.data.length; i++) {
    TestValidator.predicate(
      `descending order check at index ${i}`,
      descSnapshots.data[i - 1].created_at >= descSnapshots.data[i].created_at,
    );
  }
  // 9. Validate snapshot structure
  for (const snapshot of allSnapshots.data) {
    typia.assert(snapshot);
    TestValidator.predicate("snapshot has id", snapshot.id.length > 0);
    TestValidator.predicate("snapshot has name", snapshot.name.length > 0);
    TestValidator.predicate(
      "snapshot has created_at",
      snapshot.created_at.length > 0,
    );
  }
  // 10. Validate pagination metadata
  TestValidator.predicate(
    "pagination has current page",
    allSnapshots.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    allSnapshots.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records",
    allSnapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    allSnapshots.pagination.pages >= 0,
  );
}
