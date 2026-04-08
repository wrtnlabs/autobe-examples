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
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

/**
 * Test that an administrator can successfully update a category's name and description.
 *
 * Validates the complete category update workflow for administrators. The test verifies that an admin can authenticate, create categories, and successfully update a category's name and description through the PUT endpoint. The update operation should preserve the category's ID and other existing properties while applying the new values.
 *
 * 1. Administrator registers and authenticates via admin join endpoint.
 * 2. A parent category is created for potential subcategory testing.
 * 3. A target category is created to be updated in subsequent steps.
 * 4. The category is updated with new name and description via PUT request.
 * 5. Response is validated to confirm name and description match the update input.
 */
export async function test_api_category_update_name_and_description_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create parent category
  const parentCategory =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(parentCategory);
  // 3. Create target category
  const targetCategory =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 1 }),
          parent_id: parentCategory.id,
        },
      },
    );
  typia.assert(targetCategory);
  // 4. Update category with new name and description
  const newName = RandomGenerator.name();
  const newDescription = RandomGenerator.paragraph({ sentences: 3 });
  const updatedCategory =
    await api.functional.ecommerceMall.admin.admin.categories.update(
      adminConnection,
      {
        categoryId: targetCategory.id,
        body: {
          name: newName,
          description: newDescription,
        } satisfies IEcommerceMallCategory.IUpdate,
      },
    );
  typia.assert(updatedCategory);
  // 5. Validate response
  TestValidator.equals(
    "category id preserved",
    updatedCategory.id,
    targetCategory.id,
  );
  TestValidator.equals("new name applied", updatedCategory.name, newName);
  TestValidator.equals(
    "new description applied",
    updatedCategory.description,
    newDescription,
  );
  TestValidator.equals(
    "parent preserved",
    updatedCategory.parent?.id,
    parentCategory.id,
  );
}
