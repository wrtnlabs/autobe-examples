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
 * Test that an administrator can reassign a subcategory to become a top-level
 * category by setting parentId to null.
 *
 * Steps:
 * 1. Authenticate as administrator
 * 2. Create a parent category
 * 3. Create a subcategory under the parent category
 * 4. Update the subcategory with parentId set to null to make it top-level
 * 5. Validate the response returns success
 * 6. Validate the category now has parent set to null (top-level)
 */
export async function test_api_category_reassign_subcategory_to_toplevel(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  // 2. Create a parent category
  const parentCategory =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(parentCategory);
  TestValidator.equals(
    "parent category exists",
    parentCategory.id !== undefined,
    true,
  );
  TestValidator.equals(
    "parent category has no parent",
    parentCategory.parent ?? null,
    null,
  );
  // 3. Create a subcategory under the parent category
  const subcategory =
    await generate_random_ecommerce_mall_admin_admin_categories_subcategories_create(
      adminConnection,
      {
        params: { categoryId: parentCategory.id },
      },
    );
  typia.assert(subcategory);
  TestValidator.equals(
    "subcategory has parent",
    subcategory.parent !== undefined,
    true,
  );
  TestValidator.equals(
    "subcategory parent matches",
    subcategory.parent?.id,
    parentCategory.id,
  );
  // 4. Update the subcategory with parentId set to null to make it top-level
  const updatedCategory =
    await api.functional.ecommerceMall.admin.admin.categories.update(
      adminConnection,
      {
        categoryId: subcategory.id,
        body: {
          parentId: null,
        } satisfies IEcommerceMallCategory.IUpdate,
      },
    );
  typia.assert(updatedCategory);
  // 5. Validate the response returns success
  TestValidator.equals(
    "category id preserved",
    updatedCategory.id,
    subcategory.id,
  );
  TestValidator.equals(
    "category name preserved",
    updatedCategory.name,
    subcategory.name,
  );
  // 6. Validate the category now has parent set to null (top-level)
  TestValidator.equals(
    "category is now top-level (parent is null)",
    updatedCategory.parent ?? null,
    null,
  );
}
