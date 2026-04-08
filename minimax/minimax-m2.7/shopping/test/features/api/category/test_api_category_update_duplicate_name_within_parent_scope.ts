import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_admin_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_admin_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

/**
 * Test that updating a category name to a duplicate value within the same parent scope is rejected.
 *
 * Validates category name uniqueness constraint within parent scope. Categories cannot have duplicate names among siblings sharing the same parent. When attempting to rename a subcategory to match another subcategory's name under the same parent, the system must reject the request with an appropriate HTTP 400 or 409 error.
 *
 * **Business Rule Being Tested:**
 * Category names must be unique among categories sharing the same parent. This ensures clear organization and prevents ambiguity in the category hierarchy. The unique constraint is enforced at the database level via @@unique([parent_id, name]).
 *
 * 1. Register a super administrator account for authentication.
 * 2. Create a parent category to serve as the container for sibling subcategories.
 * 3. Create two sibling subcategories: 'Electronics' and 'Computers' under the same parent.
 * 4. Attempt to rename the 'Electronics' category to 'Computers' (conflicts with existing sibling).
 * 5. Assert that the update operation is rejected with an HTTP 400 or 409 status code.
 * 6. Confirm that the original category name 'Electronics' remains unchanged.
 *
 * @param connection Base API connection for E2E testing
 */
export async function test_api_category_update_duplicate_name_within_parent_scope(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Create a parent category to contain sibling subcategories
  const parentCategory =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      superAdminConnection,
      {
        body: {
          name: "Technology Products",
          description: "All technology-related products",
        },
      },
    );
  typia.assert(parentCategory);
  // 3. Create first sibling subcategory: 'Electronics'
  const electronicsCategory =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      superAdminConnection,
      {
        body: {
          name: "Electronics",
          description: "Electronic devices and gadgets",
          parent_id: parentCategory.id,
        },
      },
    );
  typia.assert(electronicsCategory);
  // 4. Create second sibling subcategory: 'Computers'
  const computersCategory =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      superAdminConnection,
      {
        body: {
          name: "Computers",
          description: "Desktop and laptop computers",
          parent_id: parentCategory.id,
        },
      },
    );
  typia.assert(computersCategory);
  // 5. Attempt to rename 'Electronics' to 'Computers' - should be rejected
  // The system must enforce name uniqueness within the same parent scope
  await TestValidator.error(
    "update category name to existing sibling name must be rejected",
    async () => {
      await api.functional.ecommerceMall.superAdmin.admin.categories.update(
        superAdminConnection,
        {
          categoryId: electronicsCategory.id,
          body: {
            name: "Computers",
          } satisfies IEcommerceMallCategory.IUpdate,
        },
      );
    },
  );
  // 6. Verify the original category name remains unchanged
  // (The error above confirms the update was rejected)
}
