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
 * Test partial update functionality for category fields where only one field is modified at a time.
 *
 * Validates that administrators can update either the name or description field independently while preserving the other field. The test verifies that partial updates correctly modify only the specified field, maintain unchanged fields, refresh the updated_at timestamp, and preserve category structure and relationships.
 *
 * Special attention is given to ensuring that the category ID remains constant, the unchanged field values are preserved exactly, and the category remains active (deleted_at is null) throughout the partial update operations.
 *
 * 1. Administrator authenticates to gain permission to update categories.
 * 2. A category is created with initial name and description values.
 * 3. First partial update modifies only the name field while preserving description.
 * 4. Validates that name changed, description unchanged, and updated_at refreshed.
 * 5. Second partial update modifies only the description field while preserving name.
 * 6. Validates that description changed, name unchanged, and updated_at refreshed again.
 * 7. Verifies category structure including subcategories array is preserved.
 */
export async function test_api_category_partial_update_single_field(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {},
  });
  // 2. Create initial category
  const initialCategory =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(initialCategory);
  // Store initial values for validation
  const initialName = initialCategory.name;
  const initialDescription = initialCategory.description;
  const initialUpdatedAt = initialCategory.updated_at;
  // 3. First partial update: update only name
  const newName = RandomGenerator.paragraph({ sentences: 3 });
  const updatedCategory1 =
    await api.functional.shoppingMall.administrator.categories.update(
      adminConnection,
      {
        categoryId: initialCategory.id,
        body: {
          name: newName,
        } satisfies IShoppingMallCategory.IUpdate,
      },
    );
  typia.assert(updatedCategory1);
  // 4. Validate first partial update
  TestValidator.equals(
    "name updated to new value",
    updatedCategory1.name,
    newName,
  );
  TestValidator.equals(
    "description preserved unchanged",
    updatedCategory1.description,
    initialDescription,
  );
  TestValidator.equals(
    "category id remains constant",
    updatedCategory1.id,
    initialCategory.id,
  );
  TestValidator.predicate(
    "updated_at timestamp refreshed",
    updatedCategory1.updated_at > initialUpdatedAt,
  );
  TestValidator.equals(
    "deleted_at remains null",
    updatedCategory1.deleted_at,
    null,
  );
  TestValidator.equals(
    "subcategories array preserved",
    updatedCategory1.subcategories,
    initialCategory.subcategories,
  );
  // 5. Second partial update: update only description
  const newDescription = RandomGenerator.content({ paragraphs: 1 });
  const updatedCategory2 =
    await api.functional.shoppingMall.administrator.categories.update(
      adminConnection,
      {
        categoryId: initialCategory.id,
        body: {
          description: newDescription,
        } satisfies IShoppingMallCategory.IUpdate,
      },
    );
  typia.assert(updatedCategory2);
  // 6. Validate second partial update
  TestValidator.equals(
    "name preserved from first update",
    updatedCategory2.name,
    newName,
  );
  TestValidator.equals(
    "description updated to new value",
    updatedCategory2.description,
    newDescription,
  );
  TestValidator.equals(
    "category id remains constant",
    updatedCategory2.id,
    initialCategory.id,
  );
  TestValidator.predicate(
    "updated_at timestamp refreshed again",
    updatedCategory2.updated_at > updatedCategory1.updated_at,
  );
  TestValidator.equals(
    "deleted_at remains null",
    updatedCategory2.deleted_at,
    null,
  );
  TestValidator.equals(
    "subcategories array still preserved",
    updatedCategory2.subcategories,
    initialCategory.subcategories,
  );
}
