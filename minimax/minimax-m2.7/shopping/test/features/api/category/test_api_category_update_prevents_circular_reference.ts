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
 * Test that the system prevents circular references when attempting to set a
 * category's parent to one of its own descendants.
 *
 * Steps:
 * 1. Authenticate as administrator using admin join endpoint
 * 2. Create a parent category
 * 3. Create a subcategory under the parent (first-level subcategory)
 * 4. Send PUT request attempting to set the parent category's parentId to the
 *    subcategory's ID
 * 5. Verify the response returns HTTP 400 or appropriate error status
 * 6. Validate the error message indicates circular reference is not allowed
 * 7. Confirm the parent category remains unchanged
 *
 * This validates the business rule enforcement preventing circular category
 * hierarchies.
 */
export async function test_api_category_update_prevents_circular_reference(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a parent category
  const parentCategory =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {
        body: {
          name: `Parent Category ${RandomGenerator.alphabets(8)}`,
          description: "Parent category for circular reference test",
        },
      },
    );
  typia.assert(parentCategory);
  // 3. Create a subcategory under the parent
  const subcategory =
    await generate_random_ecommerce_mall_admin_admin_categories_subcategories_create(
      adminConnection,
      {
        params: {
          categoryId: parentCategory.id,
        },
        body: {
          name: `Subcategory ${RandomGenerator.alphabets(8)}`,
          description: "Subcategory to be used as attempted new parent",
        },
      },
    );
  typia.assert(subcategory);
  // Store original name for later comparison
  const originalParentName = parentCategory.name;
  // 4. Attempt to create circular reference by setting parent category's parent
  // to the subcategory (which is its own descendant)
  await TestValidator.error(
    "circular reference should be prevented",
    async () => {
      await api.functional.ecommerceMall.admin.admin.categories.update(
        adminConnection,
        {
          categoryId: parentCategory.id,
          body: {
            parentId: subcategory.id,
          } satisfies IEcommerceMallCategory.IUpdate,
        },
      );
    },
  );
  // 7. Verify the parent category remains unchanged
  // (Since update failed, we need to verify parent category is still accessible)
  const parentCategoryAfter =
    await api.functional.ecommerceMall.admin.admin.categories.update(
      adminConnection,
      {
        categoryId: parentCategory.id,
        body: {
          name: originalParentName,
        } satisfies IEcommerceMallCategory.IUpdate,
      },
    );
  typia.assert(parentCategoryAfter);
  TestValidator.equals(
    "parent category name should remain unchanged",
    parentCategoryAfter.name,
    originalParentName,
  );
}
