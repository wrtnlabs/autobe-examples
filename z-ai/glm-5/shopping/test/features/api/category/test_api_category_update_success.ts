import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
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

/**
 * Test successful category update when administrator modifies both name and description.
 * 1. Administrator authenticates through join endpoint
 * 2. Administrator creates a top-level category with initial name and description
 * 3. Administrator updates the category with new name and description
 * 4. Validate the updated category response
 */
export async function test_api_category_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Create a top-level category with initial values
  const initialName = RandomGenerator.name();
  const initialDescription = RandomGenerator.paragraph({ sentences: 3 });
  const createdCategory =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: initialName,
          description: initialDescription,
        },
      },
    );
  typia.assert(createdCategory);
  // Store original values for comparison
  const originalId = createdCategory.id;
  const originalCreatedAt = createdCategory.created_at;
  const originalUpdatedAt = createdCategory.updated_at;
  const originalParent = createdCategory.parent;
  const originalChildren = createdCategory.children;
  // 3. Update the category with new name and description
  const newName = RandomGenerator.name();
  const newDescription = RandomGenerator.paragraph({ sentences: 5 });
  const updateBody = {
    name: newName,
    description: newDescription,
  } satisfies IShoppingMallCategory.IUpdate;
  const updatedCategory =
    await api.functional.shoppingMall.administrator.admin.categories.update(
      adminConnection,
      {
        categoryId: originalId,
        body: updateBody,
      },
    );
  typia.assert(updatedCategory);
  // 4. Validate the update response
  // (1) The response contains the updated category with new values
  TestValidator.equals("updated name", updatedCategory.name, newName);
  TestValidator.equals(
    "updated description",
    updatedCategory.description,
    newDescription,
  );
  // (2) The updated_at timestamp is refreshed
  TestValidator.predicate(
    "updated_at is refreshed",
    new Date(updatedCategory.updated_at).getTime() >=
      new Date(originalUpdatedAt).getTime(),
  );
  // (3) The category id remains unchanged
  TestValidator.equals("category id unchanged", updatedCategory.id, originalId);
  // (4) The created_at remains unchanged
  TestValidator.equals(
    "created_at unchanged",
    updatedCategory.created_at,
    originalCreatedAt,
  );
  // (5) Parent relationship remains intact (should still be null for top-level)
  TestValidator.equals(
    "parent unchanged",
    updatedCategory.parent,
    originalParent,
  );
  // (6) Children relationship remains intact (should be empty array)
  TestValidator.equals(
    "children unchanged",
    updatedCategory.children,
    originalChildren,
  );
}
