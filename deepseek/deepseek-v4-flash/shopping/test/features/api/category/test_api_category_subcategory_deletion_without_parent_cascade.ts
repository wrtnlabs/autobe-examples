import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_e_commerce_mall_super_administrator_categories_create } from "../../../generate/generate_random_e_commerce_mall_super_administrator_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

/**
 * Test deleting a subcategory without cascading to its parent top-level category.
 *
 * Verifies that deleting a subcategory (a category with a parent_id set) does not cascade-delete the parent category. The system's soft-delete logic for subcategories targets only the subcategory record itself, leaving the parent and any sibling subcategories intact. This test uses indirect verification by creating a second subcategory after deletion — if the parent were deleted, the second subcategory creation would fail.
 *
 * 1. Authenticate as superAdministrator via {@link authorize_super_administrator_join}.
 * 2. Create a top-level parent category (no parent_id). Verify it's top-level (parent is null).
 * 3. Create a subcategory under the parent (parent_id set). Verify parent reference and active status (deleted_at is null).
 * 4. Delete the subcategory via the erase endpoint.
 * 5. Create a second subcategory under the same parent. Success proves the parent category was not cascade-deleted.
 *
 * @param connection API connection configuration
 */
export async function test_api_category_subcategory_deletion_without_parent_cascade(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdministrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_super_administrator_join(adminConnection, {});
  typia.assert(admin);
  // 2. Create a top-level parent category
  const parentCategory: IECommerceMallCategory =
    await generate_random_e_commerce_mall_super_administrator_categories_create(
      adminConnection,
      {},
    );
  typia.assert(parentCategory);
  TestValidator.equals(
    "parent is top-level (parent is null)",
    parentCategory.parent,
    null,
  );
  TestValidator.predicate(
    "parent category is active (not deleted)",
    parentCategory.deleted_at === null,
  );
  // 3. Create a subcategory under the parent
  const subCategory: IECommerceMallCategory =
    await generate_random_e_commerce_mall_super_administrator_categories_create(
      adminConnection,
      {
        body: {
          parent_id: parentCategory.id,
        },
      },
    );
  typia.assert(subCategory);
  TestValidator.equals(
    "subcategory references the parent",
    subCategory.parent?.id,
    parentCategory.id,
  );
  TestValidator.predicate(
    "subcategory is active (not deleted) before deletion",
    subCategory.deleted_at === null,
  );
  // 4. Delete the subcategory
  await api.functional.eCommerceMall.superAdministrator.categories.erase(
    adminConnection,
    {
      categoryId: subCategory.id,
    },
  );
  // 5. Verify the parent still exists by creating another subcategory under it
  const anotherSubCategory: IECommerceMallCategory =
    await generate_random_e_commerce_mall_super_administrator_categories_create(
      adminConnection,
      {
        body: {
          parent_id: parentCategory.id,
        },
      },
    );
  typia.assert(anotherSubCategory);
  TestValidator.equals(
    "another subcategory references the same parent (parent was not cascade-deleted)",
    anotherSubCategory.parent?.id,
    parentCategory.id,
  );
}