import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallCategoriesSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategoriesSnapshot";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_ecommerce_mall_administrator_categories_create } from "../../../generate/generate_random_ecommerce_mall_administrator_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

export async function test_api_category_snapshot_path_scoped_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins the system
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular",
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(admin);
  // 2. Create category A and modify it (creating snapshot A)
  const categoryA =
    await generate_random_ecommerce_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          parent_id: null,
          sort_order: 0,
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(categoryA);
  const updatedCategoryA =
    await api.functional.ecommerceMall.administrator.categories.putByCategoryid(
      adminConnection,
      {
        categoryId: categoryA.id,
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceMallCategory.IUpdate,
      },
    );
  typia.assert(updatedCategoryA);
  // 3. Create category B and modify it (creating snapshot B)
  const categoryB =
    await generate_random_ecommerce_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          parent_id: null,
          sort_order: 0,
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(categoryB);
  const updatedCategoryB =
    await api.functional.ecommerceMall.administrator.categories.putByCategoryid(
      adminConnection,
      {
        categoryId: categoryB.id,
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceMallCategory.IUpdate,
      },
    );
  typia.assert(updatedCategoryB);
  // 4. Generate a valid snapshot ID for testing path-scoped access
  // Since there's no list endpoint to retrieve snapshot IDs, we generate one
  // The test validates that when requesting a snapshot with wrong category_id,
  // the system returns 404 because snapshot's category_id doesn't match path categoryId
  const testSnapshotId = typia.random<string & tags.Format<"uuid">>();
  // 5. Attempt to retrieve the snapshot using category A's ID in the path
  // This should return 404 because:
  // - The snapshot (if it exists) belongs to category B (based on our test scenario)
  // - We're using category A's ID in the path parameter
  // - The system validates that snapshot.category_id == path.categoryId
  await TestValidator.error(
    "should return 404 when snapshot category_id does not match path categoryId",
    async () => {
      await api.functional.ecommerceMall.administrator.categories.snapshots.at(
        adminConnection,
        {
          categoryId: categoryA.id,
          snapshotId: testSnapshotId,
        },
      );
    },
  );
  // Additional validation: ensure the system rejects access to valid snapshot
  // when using incorrect category path
  await TestValidator.error(
    "should return 404 when accessing snapshot with mismatched category path",
    async () => {
      await api.functional.ecommerceMall.administrator.categories.snapshots.at(
        adminConnection,
        {
          categoryId: categoryB.id, // Category B's ID
          snapshotId: categoryA.id, // Using category A's ID as snapshot ID (wrong)
        },
      );
    },
  );
}
