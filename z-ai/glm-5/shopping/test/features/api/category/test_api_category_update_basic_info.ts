import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_categories_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";

export async function test_api_category_update_basic_info(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Create a test category to update
  const originalCategory =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {},
    );
  typia.assert(originalCategory);
  // Store original values for comparison
  const originalId = originalCategory.id;
  const originalCreatedAt = originalCategory.created_at;
  const originalParent = originalCategory.parent;
  // 3. Prepare update data with new name and description
  const updateBody = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallCategory.IUpdate;
  // 4. Update the category
  const updatedCategory =
    await api.functional.shoppingMall.administrator.categories.update(
      adminConnection,
      {
        categoryId: originalCategory.id,
        body: updateBody,
      },
    );
  typia.assert(updatedCategory);
  // 5. Verify name is updated
  TestValidator.equals("name updated", updatedCategory.name, updateBody.name);
  // 6. Verify description is updated
  TestValidator.equals(
    "description updated",
    updatedCategory.description,
    updateBody.description,
  );
  // 7. Verify updated_at is refreshed (must be different from original)
  TestValidator.notEquals(
    "updated_at refreshed",
    updatedCategory.updated_at,
    originalCategory.updated_at,
  );
  // 8. Verify immutable fields remain unchanged
  TestValidator.equals("id unchanged", updatedCategory.id, originalId);
  TestValidator.equals(
    "created_at unchanged",
    updatedCategory.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "parent unchanged",
    updatedCategory.parent,
    originalParent,
  );
  // 9. Verify deleted_at is null (category is active)
  TestValidator.equals("not deleted", updatedCategory.deleted_at, null);
}
