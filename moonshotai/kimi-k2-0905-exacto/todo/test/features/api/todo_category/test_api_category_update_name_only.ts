import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppCategory";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_category_update_name_only(
  connection: api.IConnection,
) {
  // Step 1: Create new user account for authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "password123",
      ip: null,
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);

  // Step 2: Create initial category with name and description
  const originalCategory = await api.functional.todoApp.user.categories.create(
    connection,
    {
      body: {
        name: "Work Tasks",
        description: "Professional and work-related todo items",
      } satisfies ITodoAppCategory.ICreate,
    },
  );
  typia.assert(originalCategory);

  // Step 3: Create a second category for uniqueness constraint testing
  const secondCategory = await api.functional.todoApp.user.categories.create(
    connection,
    {
      body: {
        name: "Personal Tasks",
        description: "Personal and household todo items",
      } satisfies ITodoAppCategory.ICreate,
    },
  );
  typia.assert(secondCategory);

  // Step 4: Update only the category name, leaving description unchanged
  const updatedName = "Professional Work";
  const updatedCategory = await api.functional.todoApp.user.categories.update(
    connection,
    {
      categoryId: originalCategory.id,
      body: {
        name: updatedName,
      } satisfies ITodoAppCategory.IUpdate,
    },
  );
  typia.assert(updatedCategory);

  // Step 5: Verify the update was successful and only name changed
  TestValidator.equals(
    "category ID remains same",
    updatedCategory.id,
    originalCategory.id,
  );
  TestValidator.equals(
    "category name updated",
    updatedCategory.name,
    updatedName,
  );
  TestValidator.equals(
    "category description unchanged",
    updatedCategory.description,
    originalCategory.description,
  );
  TestValidator.equals(
    "user remains same",
    updatedCategory.user.id,
    originalCategory.user.id,
  );
  TestValidator.predicate(
    "updated_at timestamp changed",
    updatedCategory.updated_at !== originalCategory.updated_at,
  );

  // Step 6: Test updating second category to have the same name as the first (should fail)
  await TestValidator.error("duplicate category name should fail", async () => {
    await api.functional.todoApp.user.categories.update(connection, {
      categoryId: secondCategory.id,
      body: {
        name: updatedName, // Same name as first category
      } satisfies ITodoAppCategory.IUpdate,
    });
  });

  // Step 7: Test updating with null description
  const nullDescriptionCategory =
    await api.functional.todoApp.user.categories.create(connection, {
      body: {
        name: "Test Category",
        description: "Will be nullified",
      } satisfies ITodoAppCategory.ICreate,
    });
  typia.assert(nullDescriptionCategory);

  const nullDescUpdated = await api.functional.todoApp.user.categories.update(
    connection,
    {
      categoryId: nullDescriptionCategory.id,
      body: {
        name: "Test Category Updated",
        description: null,
      } satisfies ITodoAppCategory.IUpdate,
    },
  );
  typia.assert(nullDescUpdated);

  TestValidator.equals(
    "category description set to null",
    nullDescUpdated.description,
    null,
  );
  TestValidator.equals(
    "category name updated correctly",
    nullDescUpdated.name,
    "Test Category Updated",
  );

  // Step 8: Test partial update with only name (no description field)
  const nameOnlyUpdate = await api.functional.todoApp.user.categories.update(
    connection,
    {
      categoryId: nullDescUpdated.id,
      body: {
        name: "Name Only Update",
      } satisfies ITodoAppCategory.IUpdate,
    },
  );
  typia.assert(nameOnlyUpdate);

  TestValidator.equals(
    "category name updated via partial update",
    nameOnlyUpdate.name,
    "Name Only Update",
  );
  TestValidator.equals(
    "description remains null after partial update",
    nameOnlyUpdate.description,
    null,
  );
}
