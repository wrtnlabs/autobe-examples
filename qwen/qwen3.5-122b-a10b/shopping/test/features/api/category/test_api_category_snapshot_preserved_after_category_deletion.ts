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

/**
 * Test that category snapshots remain accessible even after the associated category has been deleted.
 * This validates the data preservation requirement for audit trail integrity.
 */
export async function test_api_category_snapshot_preserved_after_category_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(adminAuth);
  // 2. Create a category
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(category);
  // 3. Update the category to trigger snapshot creation
  const updatedCategory =
    await api.functional.ecommerceMall.admin.categories.update(
      adminConnection,
      {
        categoryId: category.id,
        body: {
          name: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IEcommerceMallCategory.IUpdate,
      },
    );
  typia.assert(updatedCategory);
  // 4. Retrieve the snapshot list to obtain the snapshot ID
  const snapshots =
    await api.functional.ecommerceMall.admin.category_snapshots.index(
      adminConnection,
      {
        body: {
          category_id: category.id,
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallCategorySnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // Find the most recent snapshot
  TestValidator.predicate(
    "snapshots exist for category",
    snapshots.data.length > 0,
  );
  const snapshotSummary = snapshots.data[0];
  // 5. Delete the category
  await api.functional.ecommerceMall.admin.categories.erase(adminConnection, {
    categoryId: category.id,
  });
  // 6. Attempt to retrieve the snapshot - should succeed even though category is deleted
  const snapshot =
    await api.functional.ecommerceMall.admin.category_snapshots.at(
      adminConnection,
      {
        snapshotId: snapshotSummary.id,
      },
    );
  typia.assert(snapshot);
  // Validation: Snapshot contains all required fields
  TestValidator.equals("snapshot ID matches", snapshot.id, snapshotSummary.id);
  TestValidator.equals(
    "snapshot has category reference",
    snapshot.category.id,
    category.id,
  );
  TestValidator.predicate(
    "snapshot has previous_values",
    snapshot.previous_values !== undefined,
  );
  TestValidator.predicate(
    "snapshot has current_values",
    snapshot.current_values !== undefined,
  );
  TestValidator.predicate(
    "snapshot has admin reference",
    snapshot.admin !== undefined,
  );
  TestValidator.predicate(
    "snapshot has created_at",
    snapshot.created_at !== undefined,
  );
  // Validation: Category in snapshot shows deleted_at is set
  TestValidator.predicate(
    "category is deleted (deleted_at is not null)",
    snapshot.category.deleted_at !== null,
  );
}