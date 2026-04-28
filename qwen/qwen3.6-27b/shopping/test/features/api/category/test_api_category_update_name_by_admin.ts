import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_ecommerce_platform_admin_categories_create } from "../../../generate/generate_random_ecommerce_platform_admin_categories_create";
import { prepare_random_ecommerce_platform_category } from "../../../prepare/prepare_random_ecommerce_platform_category";

/**
 * Test category name update by administrator with other fields preserved.
 *
 * Validates that an administrator can partially update a category by changing only the name field. Ensures the description remains unchanged and the updated_at timestamp is properly refreshed after the modification.
 *
 * Tests the partial update behavior where only provided fields in the request body are modified, and unprovided fields retain their original values.
 *
 * 1. Register an administrator account for platform authentication.
 * 2. Create a new product category with an initial name and description.
 * 3. Update the category providing only a new name in the request body.
 * 4. Verify the category name is updated to the new value, the description remains unchanged, and the updated_at timestamp is refreshed.
 */
export async function test_api_category_update_name_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, { body: {} });
  typia.assert(authorized);
  // 2. Create a category with known name and description
  const originalName = RandomGenerator.name();
  const originalDescription = RandomGenerator.paragraph({ sentences: 2 });
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: originalName,
          description: originalDescription,
        },
      },
    );
  typia.assert(category);
  // 3. Update the category with only a new name
  const newName = RandomGenerator.name();
  const body = { name: newName } satisfies IEcommercePlatformCategory.IUpdate;
  const updatedCategory =
    await api.functional.ecommercePlatform.admin.categories.update(
      adminConnection,
      {
        categoryId: category.id,
        body,
      },
    );
  typia.assert(updatedCategory);
  // 4. Validate the update results
  TestValidator.equals("category name updated", updatedCategory.name, newName);
  TestValidator.equals(
    "description remains unchanged",
    updatedCategory.description,
    originalDescription,
  );
  TestValidator.predicate(
    "updated_at timestamp refreshed",
    updatedCategory.updated_at !== category.updated_at,
  );
}
