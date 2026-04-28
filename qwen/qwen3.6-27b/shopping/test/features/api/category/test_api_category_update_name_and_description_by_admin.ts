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
 * Test administrator updating a category's name and description fields.
 *
 * Validates the complete category update workflow including administrative authentication, initial category creation, and subsequent modification of mutable fields. Ensures that the name and description changes are persisted correctly and that the updated_at timestamp is refreshed upon modification.
 *
 * Special attention is given to verifying that the category identity remains intact while mutable fields are updated, and that the system correctly distinguishes between creation and modification timestamps.
 *
 * 1. Administrator registers with email and credentials for platform management access.
 * 2. Administrator creates a root category with an initial name and description.
 * 3. Administrator updates the category with a new name and new description.
 * 4. Validates that the returned category reflects both the updated name and description, maintains the original id, and has an updated_at timestamp that is newer than created_at.
 */
export async function test_api_category_update_name_and_description_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, { body: {} });
  // 2. Create initial category
  const initialName = RandomGenerator.paragraph({ sentences: 2 });
  const initialDescription = RandomGenerator.paragraph({ sentences: 3 });
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: initialName,
          description: initialDescription,
        },
      },
    );
  typia.assert(category);
  TestValidator.equals("initial name matches", category.name, initialName);
  TestValidator.equals(
    "initial description matches",
    category.description,
    initialDescription,
  );
  const createdAt = category.created_at;
  // 3. Update category with new name and description
  const updatedName = RandomGenerator.paragraph({ sentences: 2 });
  const updatedDescription = RandomGenerator.paragraph({ sentences: 4 });
  const body = {
    name: updatedName,
    description: updatedDescription,
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
  // 4. Validate updated category
  TestValidator.equals("id remains same", updatedCategory.id, category.id);
  TestValidator.equals("name updated", updatedCategory.name, updatedName);
  TestValidator.equals(
    "description updated",
    updatedCategory.description,
    updatedDescription,
  );
  TestValidator.predicate(
    "updated_at is newer than created_at",
    updatedCategory.updated_at >= createdAt,
  );
}
