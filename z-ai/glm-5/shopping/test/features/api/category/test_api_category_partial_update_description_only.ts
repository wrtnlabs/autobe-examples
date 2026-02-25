import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";

/**
 * Test partial category update by modifying only the description field.
 *
 * This scenario validates that administrators can perform partial updates on categories,
 * updating only specific fields while leaving others unchanged. The test updates only
 * the description without changing the category name.
 *
 * Steps:
 * 1. Authenticate as administrator using POST /shoppingMall/auth/admin/join
 * 2. Create a category using POST /shoppingMall/admin/categories with name 'Books' and description 'Reading materials'
 * 3. Update the category using PUT /shoppingMall/admin/categories/{categoryId} with only description field set to 'Books, magazines, and educational materials' (name not included in request body)
 * 4. Verify the response contains the category with unchanged name 'Books'
 * 5. Verify the description is updated to the new value
 * 6. Verify the updated_at timestamp reflects the modification time
 *
 * Validation points:
 * - Response status 200 OK
 * - Category name remains 'Books' (unchanged)
 * - Description is updated to 'Books, magazines, and educational materials'
 * - updated_at timestamp is updated
 * - Partial update is supported per IShoppingMallCategory.IUpdate schema (all fields optional)
 */
export async function test_api_category_partial_update_description_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create new connection and authorize
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a category with initial name and description
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: "Books",
        description: "Reading materials",
      },
    },
  );
  typia.assert(category);
  // Store original values for comparison
  const originalName = category.name;
  const originalUpdatedAt = category.updatedAt;
  // 3. Update the category with only description (partial update)
  const updatedCategory =
    await api.functional.shoppingMall.admin.categories.update(adminConnection, {
      categoryId: category.id,
      body: {
        description: "Books, magazines, and educational materials",
      } satisfies IShoppingMallCategory.IUpdate,
    });
  typia.assert(updatedCategory);
  // 4. Validate partial update behavior
  TestValidator.equals("name unchanged", updatedCategory.name, originalName);
  TestValidator.equals(
    "description updated",
    updatedCategory.description,
    "Books, magazines, and educational materials",
  );
  TestValidator.predicate(
    "updatedAt is modified",
    new Date(updatedCategory.updatedAt).getTime() >=
      new Date(originalUpdatedAt).getTime(),
  );
}
