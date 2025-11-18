import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppCategory";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test successful category creation with properly formatted names, optional
 * descriptions, and valid character sets. Validates the core category creation
 * workflow including name validation rules that allow letters, numbers, spaces,
 * and hyphens within the 2-50 character limits.
 *
 * Test workflow:
 *
 * 1. Create a new user account for authentication
 * 2. Generate multiple category creation requests with valid name patterns:
 *
 *    - Names within 2-50 character range
 *    - Names containing allowed characters (letters, numbers, spaces, hyphens)
 *    - Names with optional descriptions
 *    - Edge cases at character limits
 * 3. Validate that each category creation succeeds and returns proper data
 *    structure
 * 4. Verify category name formatting rules are enforced by the API
 *
 * This comprehensive test validates both successful creation scenarios and edge
 * cases within the valid input space.
 */
export async function test_api_category_creation_with_valid_formatting(
  connection: api.IConnection,
) {
  // Create user account for authentication
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      ip: null,
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);

  // Test case 1: Category with standard alphanumeric name
  const category1Name = RandomGenerator.name();
  const category1 = await api.functional.todoApp.user.categories.create(
    connection,
    {
      body: {
        name: category1Name,
        description: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies ITodoAppCategory.ICreate,
    },
  );
  typia.assert(category1);

  await TestValidator.equals(
    "category 1 name matches input",
    category1.name,
    category1Name,
  );
  await TestValidator.equals(
    "category 1 user reference matches",
    category1.user.id,
    user.id,
  );

  // Test case 2: Category with name containing spaces and hyphens
  const category2Name = `${RandomGenerator.alphabets(10)}-${RandomGenerator.alphabets(5)} ${RandomGenerator.alphabets(8)}`;
  const category2 = await api.functional.todoApp.user.categories.create(
    connection,
    {
      body: {
        name: category2Name,
        description: null,
      } satisfies ITodoAppCategory.ICreate,
    },
  );
  typia.assert(category2);

  await TestValidator.equals(
    "category 2 name contains hyphens and spaces",
    category2.name,
    category2Name,
  );
  await TestValidator.equals(
    "category 2 description is null",
    category2.description,
    null,
  );

  // Test case 3: Category with minimum length name (2 characters)
  const category3Name = RandomGenerator.alphabets(2);
  const category3 = await api.functional.todoApp.user.categories.create(
    connection,
    {
      body: {
        name: category3Name,
      } satisfies ITodoAppCategory.ICreate,
    },
  );
  typia.assert(category3);

  await TestValidator.equals(
    "category 3 has minimum length name",
    category3.name.length,
    2,
  );

  // Test case 4: Category with maximum length name (50 characters)
  const category4Name = RandomGenerator.alphabets(50);
  const category4 = await api.functional.todoApp.user.categories.create(
    connection,
    {
      body: {
        name: category4Name,
      } satisfies ITodoAppCategory.ICreate,
    },
  );
  typia.assert(category4);

  await TestValidator.equals(
    "category 4 has maximum length name",
    category4.name.length,
    50,
  );

  // Test case 5: Category with numerical characters
  const category5Name = `Task ${RandomGenerator.alphaNumeric(8)}`;
  const category5 = await api.functional.todoApp.user.categories.create(
    connection,
    {
      body: {
        name: category5Name,
      } satisfies ITodoAppCategory.ICreate,
    },
  );
  typia.assert(category5);

  await TestValidator.equals(
    "category 5 contains numbers",
    category5.name.includes(category5Name.split(" ")[1]),
    true,
  );

  // Test case 6: Category with mixed allowed characters
  const category6Name = `${RandomGenerator.alphabets(10)} ${RandomGenerator.alphaNumeric(8)}-${RandomGenerator.alphabets(5)}`;
  const category6 = await api.functional.todoApp.user.categories.create(
    connection,
    {
      body: {
        name: category6Name,
      } satisfies ITodoAppCategory.ICreate,
    },
  );
  typia.assert(category6);

  await TestValidator.equals(
    "category 6 complex name matches input",
    category6.name,
    category6Name,
  );

  // Validate all categories belong to the authenticated user
  await TestValidator.equals(
    "all categories belong to user",
    category1.user.id,
    user.id,
  );
  await TestValidator.equals(
    "all categories belong to user",
    category2.user.id,
    user.id,
  );
  await TestValidator.equals(
    "all categories belong to user",
    category3.user.id,
    user.id,
  );
  await TestValidator.equals(
    "all categories belong to user",
    category4.user.id,
    user.id,
  );
  await TestValidator.equals(
    "all categories belong to user",
    category5.user.id,
    user.id,
  );
  await TestValidator.equals(
    "all categories belong to user",
    category6.user.id,
    user.id,
  );

  // Validate timestamps structure without redundant format checks
  const categories = [
    category1,
    category2,
    category3,
    category4,
    category5,
    category6,
  ];
  await TestValidator.predicate(
    "all categories have valid timestamps",
    categories.every(
      (c) =>
        typeof c.created_at === "string" &&
        c.created_at.length > 0 &&
        typeof c.updated_at === "string" &&
        c.updated_at.length > 0,
    ),
  );

  // Test validation: all names are unique
  const allNames = categories.map((c) => c.name);
  await TestValidator.predicate(
    "all category names are unique",
    new Set(allNames).size === allNames.length,
  );
}
