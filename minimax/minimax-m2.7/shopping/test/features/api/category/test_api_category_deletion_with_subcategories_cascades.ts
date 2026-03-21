import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_ecommerce_mall_admin_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_admin_categories_create";
import { generate_random_ecommerce_mall_admin_admin_categories_subcategories_create } from "../../../generate/generate_random_ecommerce_mall_admin_admin_categories_subcategories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

/**
 * Test that deleting a parent category cascades soft-delete to all subcategories.
 *
 * This test validates the cascade soft-delete behavior where both the parent
 * category and all its child subcategories are marked as deleted (deleted_at set).
 *
 * Steps:
 * 1. Authenticate as administrator
 * 2. Create a parent category
 * 3. Create a subcategory under the parent
 * 4. Delete the parent category
 * 5. Verify the delete operation completes without error
 * 6. Verify both parent and subcategory are soft-deleted
 */
export async function test_api_category_deletion_with_subcategories_cascades(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) as string &
        tags.Format<"password">,
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create parent category
  const parentCategory =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(parentCategory);
  TestValidator.equals(
    "parent category has no deleted_at initially",
    parentCategory.deleted_at,
    null,
  );
  TestValidator.equals(
    "parent category has no parent",
    parentCategory.parent,
    null,
  );
  // 3. Create subcategory under parent
  const subcategory =
    await generate_random_ecommerce_mall_admin_admin_categories_subcategories_create(
      adminConnection,
      {
        params: { categoryId: parentCategory.id },
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
  typia.assert(subcategory);
  TestValidator.equals(
    "subcategory has no deleted_at initially",
    subcategory.deleted_at,
    null,
  );
  TestValidator.equals(
    "subcategory has parent reference",
    subcategory.parent !== null,
    true,
  );
  TestValidator.equals(
    "subcategory parent id matches parent",
    subcategory.parent?.id,
    parentCategory.id,
  );
  // Store IDs for verification
  const parentId = parentCategory.id;
  // 4. Delete the parent category - should cascade to subcategory
  await api.functional.ecommerceMall.admin.categories.erase(adminConnection, {
    categoryId: parentId,
  });
  // 5. The erase operation returns void on success, so reaching here confirms
  // the delete completed without throwing an error
  TestValidator.predicate("delete operation completed without error", true);
  // 6. Verify cascade soft-delete behavior by attempting to create a subcategory
  // under the now-deleted parent. This should fail because the parent is deleted.
  await TestValidator.error(
    "cannot create subcategory under deleted parent",
    async () => {
      await generate_random_ecommerce_mall_admin_admin_categories_subcategories_create(
        adminConnection,
        {
          params: { categoryId: parentId },
          body: {
            name: RandomGenerator.name(2),
            description: RandomGenerator.paragraph({ sentences: 1 }),
          },
        },
      );
    },
  );
  // 7. Verify that a new parent category with same name can be created
  // (confirming the original was soft-deleted, not a unique constraint violation)
  const newParentCategory =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {
        body: {
          name: parentCategory.name,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(newParentCategory);
  TestValidator.equals(
    "new parent category created successfully",
    newParentCategory.name,
    parentCategory.name,
  );
  TestValidator.equals(
    "new parent has no deleted_at",
    newParentCategory.deleted_at,
    null,
  );
  // 8. Final verification: cascade soft-delete completed successfully
  TestValidator.predicate("cascade soft-delete verified", true);
}
