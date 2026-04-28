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
 * Test updating only the description of a product category by an administrator.
 *
 * Validates the partial update workflow where an admin modifies only the description field while the name remains unchanged. Ensures proper timestamp behavior with updated_at being refreshed and created_at staying immutable.
 *
 * 1. Register a new administrator account for platform access.
 * 2. Create a product category with an initial name and description.
 * 3. Update the category providing only a new description value.
 * 4. Verify the description is updated, the name is unchanged, and timestamps reflect the modification.
 */
export async function test_api_category_update_description_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, { body: {} });
  // 2. Create a category
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      { body: {} },
    );
  typia.assert(category);
  const originalName = category.name;
  const originalDescription = category.description;
  const originalCreatedAt = category.created_at;
  const originalUpdatedAt = category.updated_at;
  // 3. Update only the description
  const newDescription = RandomGenerator.paragraph({ sentences: 3 });
  const body = {
    description: newDescription,
  } satisfies IEcommercePlatformCategory.IUpdate;
  const updatedCategory =
    await api.functional.ecommercePlatform.admin.categories.update(
      adminConnection,
      {
        categoryId: category.id,
        body,
      },
    );
  typia.assert(updatedCategory);
  // 4. Validate results
  TestValidator.equals(
    "description updated",
    updatedCategory.description,
    newDescription,
  );
  TestValidator.equals("name unchanged", updatedCategory.name, originalName);
  TestValidator.equals(
    "created_at unchanged",
    updatedCategory.created_at,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "updated_at refreshed",
    updatedCategory.updated_at !== originalUpdatedAt,
  );
  TestValidator.predicate(
    "description changed from original",
    updatedCategory.description !== originalDescription,
  );
}
