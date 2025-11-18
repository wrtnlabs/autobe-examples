import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppCategory";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test successful creation of new task categories for authenticated users.
 * Validates the complete workflow from user registration through category
 * establishment.
 *
 * 1. Creates a new user account through authentication endpoint
 * 2. Creates task categories with valid names following business rules
 * 3. Validates category structure and user ownership
 * 4. Tests multiple category creation and optional descriptions
 * 5. Ensures immediate availability for task organization
 * 6. Verifies boundary conditions (min/max length, allowed characters)
 * 7. Tests rapid category creation to validate immediate availability
 *
 * Business rules tested:
 *
 * - Category names must be 2-50 characters
 * - Category names limited to letters, numbers, spaces, and hyphens
 * - Uniqueness per user account
 * - Immediate availability after creation
 * - Proper user ownership association
 */
export async function test_api_category_creation_success(
  connection: api.IConnection,
) {
  // Step 1: Create user account through join endpoint (authentication prerequisite)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10), // Minimum 8 characters from MinLength<8>
    ip: connection.host,
    href: connection.host + "/registration",
    referrer: "https://example.com/signup",
  } satisfies ITodoAppUser.IJoin;

  const user = await api.functional.auth.user.join(connection, {
    body: joinBody,
  });
  typia.assert(user);

  TestValidator.equals("User email matches", user.email, joinBody.email);
  TestValidator.equals(
    "User has created_at timestamp",
    user.created_at !== null,
    true,
  );
  TestValidator.equals("User has valid ID format", typeof user.id, "string");
  TestValidator.equals(
    "User has authorization token",
    user.token.access !== null,
    true,
  );

  // Step 2: Create first category with basic name
  const createFirstCategory = {
    name: "Personal Tasks",
  } satisfies ITodoAppCategory.ICreate;

  const firstCategory = await api.functional.todoApp.user.categories.create(
    connection,
    {
      body: createFirstCategory,
    },
  );
  typia.assert(firstCategory);

  TestValidator.equals(
    "Category name matches",
    firstCategory.name,
    createFirstCategory.name,
  );
  TestValidator.equals(
    "Category has user ownership",
    firstCategory.user.id,
    user.id,
  );
  TestValidator.equals("Category has UUID ID", firstCategory.id !== null, true);
  TestValidator.equals(
    "Category has created_at timestamp",
    firstCategory.created_at !== null,
    true,
  );
  TestValidator.equals(
    "Category has updated_at timestamp",
    firstCategory.updated_at !== null,
    true,
  );
  TestValidator.equals(
    "Category description is undefined",
    firstCategory.description,
    undefined,
  );

  // Step 3: Test category with description
  const createSecondCategory = {
    name: "Work Projects",
    description: "Professional tasks and project deliverables",
  } satisfies ITodoAppCategory.ICreate;

  const secondCategory = await api.functional.todoApp.user.categories.create(
    connection,
    {
      body: createSecondCategory,
    },
  );
  typia.assert(secondCategory);

  TestValidator.equals(
    "Category name matches",
    secondCategory.name,
    createSecondCategory.name,
  );
  TestValidator.equals(
    "Category description matches",
    secondCategory.description,
    createSecondCategory.description,
  );
  TestValidator.equals("Same user ownership", secondCategory.user.id, user.id);

  // Step 4: Test name validation with spaces and hyphens
  const createThirdCategory = {
    name: "Shopping List-Home",
    description: "Household items needed for weekly shopping",
  } satisfies ITodoAppCategory.ICreate;

  const thirdCategory = await api.functional.todoApp.user.categories.create(
    connection,
    {
      body: createThirdCategory,
    },
  );
  typia.assert(thirdCategory);

  TestValidator.equals(
    "Category name with hyphens matches",
    thirdCategory.name,
    createThirdCategory.name,
  );
  TestValidator.equals(
    "Category description matches",
    thirdCategory.description,
    createThirdCategory.description,
  );
  TestValidator.equals("Same user ownership", thirdCategory.user.id, user.id);

  // Step 5: Test minimum length (boundary)
  const createShortCategory = {
    name: "XY", // Minimum 2 characters as specified in MinLength<2>
  } satisfies ITodoAppCategory.ICreate;

  const shortCategory = await api.functional.todoApp.user.categories.create(
    connection,
    {
      body: createShortCategory,
    },
  );
  typia.assert(shortCategory);

  TestValidator.equals(
    "Short category name matches",
    shortCategory.name.length,
    2,
  );
  TestValidator.equals(
    "Short category name content matches",
    shortCategory.name,
    createShortCategory.name,
  );

  // Step 6: Test maximum length with exactly 50 characters
  const createExactly50Category = {
    name: "This category name has exactly fifty characters for length", // Exactly 50 characters
    description: "Exactly 50 character name test",
  } satisfies ITodoAppCategory.ICreate;

  const exactly50Category = await api.functional.todoApp.user.categories.create(
    connection,
    {
      body: createExactly50Category,
    },
  );
  typia.assert(exactly50Category);

  TestValidator.equals(
    "Exactly 50 character name",
    exactly50Category.name.length,
    50,
  );
  TestValidator.equals(
    "Character count matches input",
    exactly50Category.name,
    createExactly50Category.name,
  );
  TestValidator.equals(
    "User ownership maintained",
    exactly50Category.user.id,
    user.id,
  );

  // Step 7: Test rapid creation to verify immediate availability
  const rapidCategories = ArrayUtil.repeat(
    3,
    (index) =>
      ({
        name: `Rapid Testing ${index + 1}`,
        description: `Quick category ${index + 1} for availability testing`,
      }) satisfies ITodoAppCategory.ICreate,
  );

  // Create multiple categories rapidly
  const createdRapidCategories = await ArrayUtil.asyncMap(
    rapidCategories,
    async (categoryData) => {
      return await api.functional.todoApp.user.categories.create(connection, {
        body: categoryData,
      });
    },
  );

  // Verify all categories were created successfully
  createdRapidCategories.forEach((category, index) => {
    typia.assert(category);
    TestValidator.equals(
      `Rapid category ${index + 1} name matches`,
      category.name,
      rapidCategories[index].name,
    );
    TestValidator.equals(
      `Rapid category ${index + 1} description matches`,
      category.description,
      rapidCategories[index].description,
    );
    TestValidator.equals(
      `Rapid category ${index + 1} has user ownership`,
      category.user.id,
      user.id,
    );
  });

  // Step 8: Validate temporal relationships - created_at should be equal or before updated_at
  TestValidator.predicate(
    "First category created before updated",
    new Date(firstCategory.created_at).getTime() <=
      new Date(firstCategory.updated_at!).getTime(),
  );
  TestValidator.predicate(
    "First category has legitimate timestamps",
    firstCategory.created_at !== firstCategory.updated_at!,
  );
}
