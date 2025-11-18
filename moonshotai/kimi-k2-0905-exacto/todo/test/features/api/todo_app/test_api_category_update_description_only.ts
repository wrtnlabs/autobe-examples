import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppCategory";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test updating only the category description while preserving the original
 * name. Validates that users can add descriptions to existing categories or
 * modify existing descriptions without affecting other category properties.
 */
export async function test_api_category_update_description_only(
  connection: api.IConnection,
) {
  // Step 1: Create new user account to establish authentication context
  const email = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password: RandomGenerator.alphaNumeric(12),
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);

  // Step 2: Create initial category for description update testing
  const categoryName = RandomGenerator.name(2);
  const category = await api.functional.todoApp.user.categories.create(
    connection,
    {
      body: {
        name: categoryName,
        description: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 8,
        }),
      } satisfies ITodoAppCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Update only the description field while preserving name and other properties
  const newDescription = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 10,
  });
  const updatedCategory = await api.functional.todoApp.user.categories.update(
    connection,
    {
      categoryId: category.id,
      body: {
        description: newDescription,
      } satisfies ITodoAppCategory.IUpdate,
    },
  );
  typia.assert(updatedCategory);

  // Step 4: Verify that only description was updated while name remains unchanged
  TestValidator.notEquals(
    "original and updated description differ",
    category.description,
    updatedCategory.description,
  );
  TestValidator.equals(
    "original and updated name match",
    category.name,
    updatedCategory.name,
  );
  TestValidator.equals(
    "category ID remains unchanged",
    category.id,
    updatedCategory.id,
  );
  TestValidator.equals(
    "updated description matches request",
    updatedCategory.description,
    newDescription,
  );
  TestValidator.equals(
    "category ownership preserved",
    category.user.id,
    updatedCategory.user.id,
  );
}
