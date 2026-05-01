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
 * Test updating an existing top-level category's name and description.
 *
 * Validates that an authenticated administrator can successfully modify a
 * category's name and description fields. The test confirms that both fields
 * are updated to the provided values, the `updated_at` timestamp advances to
 * reflect the modification, and all other fields remain unchanged.
 *
 * 1. Administrator registers and authenticates via `authorize_admin_join`.
 * 2. A top-level category is created with randomized data.
 * 3. New name and description values are generated.
 * 4. The category is updated with only the new name and description.
 * 5. Validates the response preserves id, created_at, parent, and deleted_at
 *    while reflecting the new name, description, and advanced updated_at.
 */
export async function test_api_category_update_name_and_description(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a top-level category
  const originalCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(originalCategory);
  // 3. Generate new name and description
  const newName = RandomGenerator.paragraph({ sentences: 2 });
  const newDescription = RandomGenerator.content({ paragraphs: 2 });
  // 4. Update the category
  const updateBody = {
    name: newName,
    description: newDescription,
  } satisfies IShoppingMallCategory.IUpdate;
  const updatedCategory =
    await api.functional.shoppingMall.admin.categories.update(adminConnection, {
      categoryId: originalCategory.id,
      body: updateBody,
    });
  typia.assert(updatedCategory);
  // 5. Validate results
  TestValidator.equals("id unchanged", updatedCategory.id, originalCategory.id);
  TestValidator.equals("name updated", updatedCategory.name, newName);
  TestValidator.equals(
    "description updated",
    updatedCategory.description,
    newDescription,
  );
  TestValidator.notEquals(
    "updated_at advanced",
    updatedCategory.updated_at,
    originalCategory.updated_at,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedCategory.created_at,
    originalCategory.created_at,
  );
  TestValidator.equals(
    "parent unchanged",
    updatedCategory.parent,
    originalCategory.parent,
  );
  TestValidator.equals("deleted_at is null", updatedCategory.deleted_at, null);
}
