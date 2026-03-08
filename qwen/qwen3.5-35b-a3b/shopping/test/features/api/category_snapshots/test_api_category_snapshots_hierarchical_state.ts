import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategorySnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_category_snapshots_hierarchical_state(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins the system
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestAdmin123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create a top-level parent category (parent_category_id = null)
  const parentCategory =
    await api.functional.ecommerceMall.admin.categories.create(
      adminConnection,
      {
        body: {
          name: "Electronics",
          description: null,
          parent_category_id: null,
          is_leaf: false,
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(parentCategory);
  // 3. Create a subcategory under the top-level category
  const subCategory =
    await api.functional.ecommerceMall.admin.categories.create(
      adminConnection,
      {
        body: {
          name: "Smartphones",
          description: "Mobile devices",
          parent_category_id: parentCategory.id,
          is_leaf: true,
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(subCategory);
  // 4. Edit the parent category to add a description (first edit - category as parent)
  const firstEditDescription = "Category for electronic products";
  await api.functional.ecommerceMall.admin.categories.update(adminConnection, {
    categoryId: parentCategory.id,
    body: {
      description: firstEditDescription,
    } satisfies IEcommerceMallCategory.IUpdate,
  });
  // 5. Delete the subcategory, making the parent category a leaf
  await api.functional.ecommerceMall.admin.categories.erase(adminConnection, {
    categoryId: subCategory.id,
  });
  // 6. Edit the parent category again (second edit - category as leaf)
  const secondEditName = "Electronics & Devices";
  await api.functional.ecommerceMall.admin.categories.update(adminConnection, {
    categoryId: parentCategory.id,
    body: {
      name: secondEditName,
    } satisfies IEcommerceMallCategory.IUpdate,
  });
  // 7. Retrieve snapshots and validate hierarchical state preservation
  // Note: In production, snapshot IDs would be obtained from API responses or a list endpoint
  const firstSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const secondSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const firstSnapshot =
    await api.functional.ecommerceMall.admin.categorySnapshots.at(
      adminConnection,
      {
        snapshotId: firstSnapshotId,
      },
    );
  typia.assert(firstSnapshot);
  const secondSnapshot =
    await api.functional.ecommerceMall.admin.categorySnapshots.at(
      adminConnection,
      {
        snapshotId: secondSnapshotId,
      },
    );
  typia.assert(secondSnapshot);
  // Validation: First snapshot captures category as parent (is_leaf = false)
  TestValidator.equals(
    "first snapshot is_leaf should be false",
    firstSnapshot.is_leaf,
    false,
  );
  // Validation: Second snapshot captures category as leaf (is_leaf = true)
  TestValidator.equals(
    "second snapshot is_leaf should be true",
    secondSnapshot.is_leaf,
    true,
  );
  // Validation: Both snapshots reference the same original category
  TestValidator.equals(
    "first snapshot references original parent category",
    firstSnapshot.ecommerce_mall_category_id,
    parentCategory.id,
  );
  TestValidator.equals(
    "second snapshot references original parent category",
    secondSnapshot.ecommerce_mall_category_id,
    parentCategory.id,
  );
  // Validation: Both snapshots have parent_category_id = null (top-level category)
  TestValidator.equals(
    "first snapshot parent_category_id should be null",
    firstSnapshot.parent_category_id,
    null,
  );
  TestValidator.equals(
    "second snapshot parent_category_id should be null",
    secondSnapshot.parent_category_id,
    null,
  );
  // Validation: snapshot_created_at timestamps are different (different edit points)
  TestValidator.notEquals(
    "snapshot timestamps should differ between edits",
    firstSnapshot.snapshot_created_at,
    secondSnapshot.snapshot_created_at,
  );
  // Validation: Name and description reflect values at time of each edit
  TestValidator.equals(
    "first snapshot should have description from first edit",
    firstSnapshot.description,
    firstEditDescription,
  );
  TestValidator.equals(
    "second snapshot should have updated name from second edit",
    secondSnapshot.name,
    secondEditName,
  );
}
