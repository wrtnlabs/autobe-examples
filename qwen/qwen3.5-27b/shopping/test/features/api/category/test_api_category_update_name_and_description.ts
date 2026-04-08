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
 * Test the primary success path for updating a category's name and description.
 *
 * Validates that an authenticated administrator can successfully modify both the name and description fields of an existing category. The test ensures proper authentication enforcement, successful field updates, timestamp refresh, and preservation of category relationships.
 *
 * Special attention is given to verifying that the updated_at timestamp is automatically refreshed, the category ID remains unchanged, and the hierarchical structure (subcategories) is maintained after the update operation.
 *
 * 1. Administrator authenticates via join endpoint.
 * 2. A new category is created with initial name and description.
 * 3. The category is updated with new name and description values.
 * 4. Validates that both fields are updated successfully in the response.
 * 5. Verifies the updated_at timestamp is refreshed and differs from created_at.
 * 6. Confirms the category ID remains the same after update.
 * 7. Ensures subcategories array is present in the response.
 */
export async function test_api_category_update_name_and_description(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Create a category
  const category: IShoppingMallCategory =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        },
      },
    );
  typia.assert(category);
  const originalCreatedAt: string = category.created_at;
  const originalUpdatedAt: string = category.updated_at;
  // 3. Prepare update input values
  const newName: string = RandomGenerator.paragraph({ sentences: 3 });
  const newDescription: string = RandomGenerator.content({ paragraphs: 2 });
  // 4. Update the category with new name and description
  const updatedCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.administrator.categories.update(
      adminConnection,
      {
        categoryId: category.id,
        body: {
          name: newName,
          description: newDescription,
        } satisfies IShoppingMallCategory.IUpdate,
      },
    );
  typia.assert(updatedCategory);
  // 5. Validate updated values match input
  TestValidator.equals(
    "updated name matches input",
    updatedCategory.name,
    newName,
  );
  TestValidator.equals(
    "updated description matches input",
    updatedCategory.description,
    newDescription,
  );
  // 6. Verify updated_at timestamp is refreshed
  TestValidator.notEquals(
    "updated_at timestamp refreshed",
    originalUpdatedAt,
    updatedCategory.updated_at,
  );
  // 7. Confirm category ID remains the same
  TestValidator.equals(
    "category ID unchanged",
    updatedCategory.id,
    category.id,
  );
  // 8. Ensure subcategories array is present
  TestValidator.predicate(
    "subcategories array exists",
    Array.isArray(updatedCategory.subcategories),
  );
  // 9. Verify created_at remains unchanged
  TestValidator.equals(
    "created_at timestamp unchanged",
    updatedCategory.created_at,
    originalCreatedAt,
  );
}
