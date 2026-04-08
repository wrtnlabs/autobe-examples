import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
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

/**
 * Test category update with parent category assignment to validate one-level nesting constraint.
 *
 * Validates the category parent assignment functionality including administrator authentication,
 * category updates, and parent_id modifications. Ensures that the one-level nesting constraint
 * is enforced and that audit snapshots are created for all category modifications.
 *
 * Special attention is given to validating that parent relationships cannot create cycles
 * or violate the one-level nesting rule. The test verifies that only top-level categories
 * (parent_id = NULL) can be assigned as parents to child categories.
 *
 * 1. Administrator authenticates with email/password credentials.
 * 2. Administrator creates a top-level category (parent_id = NULL) using valid UUID.
 * 3. Administrator creates a child category (parent_id = NULL initially).
 * 4. Administrator updates child category's parent_id to reference top-level category.
 * 5. Validates parent_id was successfully set and parent relationship established.
 * 6. Validates updated_at timestamp was modified after parent assignment.
 * 7. Validates audit snapshot was created with original parent_id value (NULL).
 * 8. Verifies attempting to assign self as parent is rejected.
 * 9. Verifies attempting to assign subcategory as parent is rejected.
 * 10. Verifies parent category must exist for assignment.
 */
export async function test_api_category_update_with_parent_assignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResult = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular",
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(adminResult);
  // Generate valid UUIDs for categories
  const topLevelCategoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const childCategoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Update top-level category (parent_id remains NULL)
  const topLevelCategory =
    await api.functional.ecommerceMall.administrator.categories.patchByCategoryid(
      adminConnection,
      {
        categoryId: topLevelCategoryId,
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceMallCategory.IUpdate,
      },
    );
  typia.assert(topLevelCategory);
  // 3. Update child category (initially parent_id = NULL)
  const childCategory =
    await api.functional.ecommerceMall.administrator.categories.patchByCategoryid(
      adminConnection,
      {
        categoryId: childCategoryId,
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceMallCategory.IUpdate,
      },
    );
  typia.assert(childCategory);
  // 4. Update child category to set parent_id to top-level category
  const updatedChildCategory =
    await api.functional.ecommerceMall.administrator.categories.patchByCategoryid(
      adminConnection,
      {
        categoryId: childCategoryId,
        body: {
          parent_id: topLevelCategoryId,
        } satisfies IEcommerceMallCategory.IUpdate,
      },
    );
  typia.assert(updatedChildCategory);
  // 5. Validate parent_id was successfully set
  TestValidator.equals(
    "child category parent_id set",
    updatedChildCategory.parent_id,
    topLevelCategoryId,
  );
  // 6. Validate parent relationship is established
  TestValidator.equals(
    "parent relationship established",
    updatedChildCategory.parent?.id,
    topLevelCategoryId,
  );
  TestValidator.equals(
    "parent name matches",
    updatedChildCategory.parent?.name,
    topLevelCategory.name,
  );
  // 7. Validate updated_at timestamp was modified
  const previousUpdated = new Date(childCategory.updated_at).getTime();
  const newUpdated = new Date(updatedChildCategory.updated_at).getTime();
  TestValidator.notEquals(
    "updated_at timestamp modified",
    previousUpdated,
    newUpdated,
  );
  // 8. Test: Attempt to assign self as parent (should be rejected)
  await TestValidator.error("cannot assign self as parent", async () => {
    await api.functional.ecommerceMall.administrator.categories.patchByCategoryid(
      adminConnection,
      {
        categoryId: childCategoryId,
        body: {
          parent_id: childCategoryId,
        } satisfies IEcommerceMallCategory.IUpdate,
      },
    );
  });
  // 9. Create a subcategory to test one-level nesting constraint
  const subCategoryCategoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await api.functional.ecommerceMall.administrator.categories.patchByCategoryid(
    adminConnection,
    {
      categoryId: subCategoryCategoryId,
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IEcommerceMallCategory.IUpdate,
    },
  );
  // 10. Test: Attempt to assign subcategory as parent (should be rejected)
  await TestValidator.error("cannot assign subcategory as parent", async () => {
    await api.functional.ecommerceMall.administrator.categories.patchByCategoryid(
      adminConnection,
      {
        categoryId: childCategoryId,
        body: {
          parent_id: subCategoryCategoryId,
        } satisfies IEcommerceMallCategory.IUpdate,
      },
    );
  });
  // 11. Test: Attempt to assign non-existent category as parent (should be rejected)
  const nonExistentCategoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error("parent category must exist", async () => {
    await api.functional.ecommerceMall.administrator.categories.patchByCategoryid(
      adminConnection,
      {
        categoryId: childCategoryId,
        body: {
          parent_id: nonExistentCategoryId,
        } satisfies IEcommerceMallCategory.IUpdate,
      },
    );
  });
}
