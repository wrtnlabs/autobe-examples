import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppCategory";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test successful creation of task categories with valid names and optional
 * descriptions. Validates category creation workflow including name uniqueness
 * enforcement, character restrictions, and proper user ownership assignment.
 * Tests the complete creation process from authentication through successful
 * category persistence with immediate availability for task assignment.
 */
export async function test_api_category_creation_success(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account through user registration
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: "SecurePassword123",
        ip: "127.0.0.1",
        href: "https://localhost:3000/register",
        referrer: "https://localhost:3000/register",
      } satisfies ITodoAppUser.IJoin,
    },
  );
  typia.assert(user);
  await TestValidator.predicate(
    "user has valid authorization",
    user.token.access.length > 0,
  );

  // Step 2: Create a new category with valid name and description
  const categoryName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  });
  const category: ITodoAppCategory =
    await api.functional.todoApp.user.categories.create(connection, {
      body: {
        name: categoryName,
        description: "A category for work-related tasks and projects",
      } satisfies ITodoAppCategory.ICreate,
    });
  typia.assert(category);

  // Verify the created category has the expected properties
  await TestValidator.predicate(
    "category name matches input",
    category.name === categoryName,
  );
  await TestValidator.predicate(
    "category has user ownership",
    category.user.id === user.id,
  );
  await TestValidator.predicate(
    "category has user email",
    category.user.email === user.email,
  );
  await TestValidator.equals(
    "category has description",
    category.description,
    "A category for work-related tasks and projects",
  );
  await TestValidator.predicate(
    "category has creation timestamp",
    category.created_at.length > 0,
  );
  await TestValidator.predicate(
    "category has update timestamp",
    category.updated_at.length > 0,
  );

  // Step 3: Create another category with different characteristics
  const personalCategoryName = "Personal Tasks";
  const personalCategory: ITodoAppCategory =
    await api.functional.todoApp.user.categories.create(connection, {
      body: {
        name: personalCategoryName,
        description: "Personal life organization and home tasks",
      } satisfies ITodoAppCategory.ICreate,
    });
  typia.assert(personalCategory);

  await TestValidator.predicate(
    "personal category name matches",
    personalCategory.name === personalCategoryName,
  );
  await TestValidator.equals(
    "personal category description",
    personalCategory.description,
    "Personal life organization and home tasks",
  );
  await TestValidator.equals(
    "personal category user ID matches",
    personalCategory.user.id,
    user.id,
  );
  await TestValidator.notEquals(
    "personal category ID differs from first category",
    personalCategory.id,
    category.id,
  );

  // Step 4: Create a category without description to validate optional field handling
  const noDescCategoryName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 5,
  });
  const noDescCategory: ITodoAppCategory =
    await api.functional.todoApp.user.categories.create(connection, {
      body: {
        name: noDescCategoryName,
      } satisfies ITodoAppCategory.ICreate,
    });
  typia.assert(noDescCategory);

  await TestValidator.predicate(
    "no-desc category name matches",
    noDescCategory.name === noDescCategoryName,
  );
  await TestValidator.equals(
    "no-desc category description is undefined",
    noDescCategory.description,
    undefined,
  );
  await TestValidator.predicate(
    "no-desc category has valid user",
    noDescCategory.user.id === user.id,
  );
}
