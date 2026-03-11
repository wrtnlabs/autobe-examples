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

export async function test_api_category_snapshot_retrieval_with_valid_category_id(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // Step 2: Create category with initial data
  const initialName = RandomGenerator.name(2);
  const initialDescription = RandomGenerator.paragraph({ sentences: 2 });
  const category = await api.functional.ecommerceMall.admin.categories.create(
    adminConnection,
    {
      body: {
        name: initialName,
        description: initialDescription,
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // Step 3: Update category first time to create first snapshot
  const firstUpdatedName = RandomGenerator.name(2);
  const firstUpdatedDescription = RandomGenerator.paragraph({ sentences: 3 });
  await api.functional.ecommerceMall.admin.categories.update(adminConnection, {
    categoryId: category.id,
    body: {
      name: firstUpdatedName,
      description: firstUpdatedDescription,
    } satisfies IEcommerceMallCategory.IUpdate,
  });
  // Step 4: Update category second time to create second snapshot
  const secondUpdatedName = RandomGenerator.name(2);
  const secondUpdatedDescription = RandomGenerator.paragraph({ sentences: 4 });
  await api.functional.ecommerceMall.admin.categories.update(adminConnection, {
    categoryId: category.id,
    body: {
      name: secondUpdatedName,
      description: secondUpdatedDescription,
    } satisfies IEcommerceMallCategory.IUpdate,
  });
  // Step 5: Retrieve snapshots for the category
  const snapshots =
    await api.functional.ecommerceMall.categories.snapshots.index(
      adminConnection,
      {
        categoryId: category.id,
      },
    );
  typia.assert(snapshots);
  // Step 6: Validate snapshots
  TestValidator.equals("snapshot count matches", snapshots.data.length, 2);
  TestValidator.predicate("has pagination", snapshots.pagination.records === 2);
  // Step 7: Validate snapshot order (newest first)
  if (snapshots.data.length >= 2) {
    const firstSnapshot = snapshots.data[0];
    const secondSnapshot = snapshots.data[1];
    TestValidator.equals(
      "first snapshot is latest",
      firstSnapshot.after_name,
      secondUpdatedName,
    );
    TestValidator.equals(
      "first snapshot description",
      firstSnapshot.after_description,
      secondUpdatedDescription,
    );
    TestValidator.equals(
      "second snapshot is older",
      secondSnapshot.after_name,
      firstUpdatedName,
    );
    TestValidator.equals(
      "second snapshot description",
      secondSnapshot.after_description,
      firstUpdatedDescription,
    );
    // Verify timestamps are in correct order (newest first)
    TestValidator.predicate(
      "timestamps in correct order",
      new Date(firstSnapshot.created_at).getTime() >=
        new Date(secondSnapshot.created_at).getTime(),
    );
    // Verify admin information is present when available
    if (firstSnapshot.admin !== null) {
      TestValidator.equals(
        "admin ID present",
        firstSnapshot.admin.id,
        adminAuth.id,
      );
    }
    if (secondSnapshot.admin !== null) {
      TestValidator.equals(
        "admin ID in second snapshot",
        secondSnapshot.admin.id,
        adminAuth.id,
      );
    }
  }
}
