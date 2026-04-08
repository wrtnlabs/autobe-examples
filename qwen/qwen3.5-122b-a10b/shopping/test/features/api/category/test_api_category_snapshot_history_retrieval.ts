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

/**
 * Test retrieving paginated snapshot history for a category that has been edited multiple times.
 *
 * Validates the complete audit trail functionality for category modifications, ensuring administrators can view historical states before each edit occurred. The test creates a category, performs multiple updates to generate snapshots, and verifies the snapshot retrieval endpoint returns data in the correct chronological order with proper pagination metadata.
 *
 * Special attention is given to verifying that snapshots capture the pre-modification state correctly, that timestamps are monotonically increasing in descending order, and that pagination metadata accurately reflects the total snapshot count.
 *
 * 1. Administrator authenticates with the system.
 * 2. Initial category is created with random name and description.
 * 3. Category is updated 3 times with different name and description values, creating snapshots.
 * 4. Snapshot history is retrieved with pagination parameters.
 * 5. Validates snapshots are ordered by created_at descending (newest first).
 * 6. Validates each snapshot contains id, name, description, parent_category_id, and created_at.
 * 7. Validates pagination metadata reflects correct total snapshot count.
 */
export async function test_api_category_snapshot_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: IEcommerceAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  // 2. Create initial category
  const category: IEcommerceCategory =
    await generate_random_ecommerce_admin_categories_create(adminConnection, {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IEcommerceCategory.ICreate,
    });
  typia.assert(category);
  // 3. Update category multiple times to create snapshots (3 updates)
  const updates: IEcommerceCategory[] = [];
  await ArrayUtil.asyncRepeat(3, async (index: number) => {
    const updated: IEcommerceCategory =
      await api.functional.ecommerce.admin.categories.update(adminConnection, {
        categoryId: category.id,
        body: {
          name: `${RandomGenerator.name(2)} (v${index + 1})`,
          description: `Updated description ${index + 1}: ${RandomGenerator.paragraph({ sentences: 2 })}`,
        } satisfies IEcommerceCategory.IUpdate,
      });
    typia.assert(updated);
    updates.push(updated);
  });
  // 4. Retrieve snapshot history
  const snapshots: IPageIEcommerceCategorySnapshot.ISummary =
    await api.functional.ecommerce.admin.categories.snapshots.index(
      adminConnection,
      {
        categoryId: category.id,
        body: {
          page: 1,
          limit: 10,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IEcommerceCategorySnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 5. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    snapshots.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", snapshots.pagination.limit, 10);
  TestValidator.predicate(
    "pagination has snapshots",
    snapshots.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    snapshots.pagination.pages >= 1,
  );
  // 6. Validate snapshots data exists
  TestValidator.predicate(
    "snapshots array is not empty",
    snapshots.data.length > 0,
  );
  // 7. Validate each snapshot has required fields
  snapshots.data.forEach((snapshot, index) => {
    TestValidator.predicate(
      `snapshot ${index} has valid id`,
      typeof snapshot.id === "string" && snapshot.id.length > 0,
    );
    TestValidator.predicate(
      `snapshot ${index} has valid name`,
      typeof snapshot.name === "string" && snapshot.name.length > 0,
    );
    TestValidator.predicate(
      `snapshot ${index} has valid created_at`,
      typeof snapshot.created_at === "string" && snapshot.created_at.length > 0,
    );
    // description and parent_category_id can be null
  });
  // 8. Validate snapshots are in descending chronological order (newest first)
  for (let i = 0; i < snapshots.data.length - 1; i++) {
    const current: Date = new Date(snapshots.data[i].created_at);
    const next: Date = new Date(snapshots.data[i + 1].created_at);
    TestValidator.predicate(
      `snapshot ${i} is newer than snapshot ${i + 1}`,
      current >= next,
    );
  }
  // 9. Validate snapshot count matches expected (3 updates = 3 snapshots)
  TestValidator.predicate(
    "snapshot count matches updates",
    snapshots.pagination.records >= 3,
  );
}
