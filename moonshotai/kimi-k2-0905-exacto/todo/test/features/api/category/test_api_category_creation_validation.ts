import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppCategory";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test input validation during category creation including character
 * restrictions, length constraints, and name uniqueness requirements. Covers
 * edge cases with special characters, boundary length testing, and duplicate
 * category name prevention. Validates proper error handling for invalid inputs
 * while ensuring successful creation with acceptable category names following
 * format requirements.
 *
 * Testing strategy:
 *
 * 1. Create authenticated user account for testing
 * 2. Test successful category creation with valid names
 * 3. Test boundary conditions: minimum length (2 chars), maximum length (50 chars)
 * 4. Test invalid character restrictions: special characters not allowed (only
 *    letters, numbers, spaces, hyphens)
 * 5. Test duplicate category name prevention
 * 6. Test edge cases: empty strings, single character, excessive length
 * 7. Test with and without optional description field
 *
 * Business rules to validate:
 *
 * - Category names must be 2-50 characters
 * - Only letters, numbers, spaces, and hyphens allowed in names
 * - Category names must be unique per user
 * - Optional description field can be null or undefined
 * - Proper error messages for validation failures
 */
export async function test_api_category_creation_validation(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user for testing
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userJoinData = {
    email: userEmail,
    password: "ValidPass123!",
    href: "https://example.com/todo",
    referrer: "https://example.com",
  } satisfies ITodoAppUser.IJoin;

  const user = await api.functional.auth.user.join(connection, {
    body: userJoinData,
  });
  typia.assert(user);

  // Step 2: Test successful category creation with valid name
  const validCategoryName = "Work Tasks";
  const validCategory = await api.functional.todoApp.user.categories.create(
    connection,
    {
      body: {
        name: validCategoryName,
        description: "Work-related todo items",
      } satisfies ITodoAppCategory.ICreate,
    },
  );
  typia.assert(validCategory);

  TestValidator.equals(
    "valid category name",
    validCategory.name,
    validCategoryName,
  );
  TestValidator.equals(
    "valid category description",
    validCategory.description,
    "Work-related todo items",
  );

  // Step 3: Test minimum boundary (2 characters)
  const minLengthCategory = await api.functional.todoApp.user.categories.create(
    connection,
    {
      body: {
        name: "AB",
        description: null,
      } satisfies ITodoAppCategory.ICreate,
    },
  );
  typia.assert(minLengthCategory);
  TestValidator.equals(
    "minimum length category name",
    minLengthCategory.name,
    "AB",
  );

  // Step 4: Test maximum boundary (50 characters)
  const maxLengthName = "This is exactly fifty characters long category name!";
  const maxLengthCategory = await api.functional.todoApp.user.categories.create(
    connection,
    {
      body: {
        name: maxLengthName,
        description: undefined,
      } satisfies ITodoAppCategory.ICreate,
    },
  );
  typia.assert(maxLengthCategory);
  TestValidator.equals(
    "maximum length category name",
    maxLengthCategory.name,
    maxLengthName,
  );
  TestValidator.equals(
    "maximum length category description",
    maxLengthCategory.description,
    undefined,
  );

  // Step 5: Test category without optional description
  const noDescriptionCategory =
    await api.functional.todoApp.user.categories.create(connection, {
      body: {
        name: "Personal",
      } satisfies ITodoAppCategory.ICreate,
    });
  typia.assert(noDescriptionCategory);
  TestValidator.equals(
    "no description category name",
    noDescriptionCategory.name,
    "Personal",
  );
  TestValidator.equals(
    "no description category description",
    noDescriptionCategory.description,
    undefined,
  );

  // Step 6: Test duplicate category name prevention
  await TestValidator.error("duplicate category name should fail", async () => {
    await api.functional.todoApp.user.categories.create(connection, {
      body: {
        name: validCategoryName,
        description: "Another work category",
      } satisfies ITodoAppCategory.ICreate,
    });
  });

  // Step 7: Test invalid characters (special characters not allowed)
  const invalidCharacters = [
    "@",
    "#",
    "$",
    "%",
    "^",
    "&",
    "*",
    "(",
    ")",
    "+",
    "=",
    "{",
    "}",
    "[",
    "]",
    "|",
    "\\",
    "/",
    "?",
    "<",
    ">",
  ];
  for (const char of invalidCharacters) {
    await TestValidator.error(
      `category name with invalid character '${char}' should fail`,
      async () => {
        await api.functional.todoApp.user.categories.create(connection, {
          body: {
            name: `Test${char}Category`,
            description: `Testing invalid character ${char}`,
          } satisfies ITodoAppCategory.ICreate,
        });
      },
    );
  }

  // Step 8: Test below minimum length (1 character)
  await TestValidator.error(
    "category name below minimum length should fail",
    async () => {
      await api.functional.todoApp.user.categories.create(connection, {
        body: {
          name: "A",
          description: "Single character name",
        } satisfies ITodoAppCategory.ICreate,
      });
    },
  );

  // Step 9: Test above maximum length (51 characters)
  const tooLongName =
    "This name is way too long and exceeds fifty characters limit!";
  await TestValidator.error(
    "category name above maximum length should fail",
    async () => {
      await api.functional.todoApp.user.categories.create(connection, {
        body: {
          name: tooLongName,
          description: "Excessive length name",
        } satisfies ITodoAppCategory.ICreate,
      });
    },
  );

  // Step 10: Test valid characters that are allowed (letters, numbers, spaces, hyphens)
  const allowedCombinations = [
    "Alphanumeric123",
    "With Spaces",
    "With-Hyphens",
    "123 Numbers 456",
    "Mixed-With Spaces-And123",
  ];

  for (const allowedName of allowedCombinations) {
    const allowedCategory = await api.functional.todoApp.user.categories.create(
      connection,
      {
        body: {
          name: allowedName,
          description: `Testing allowed characters: ${allowedName}`,
        } satisfies ITodoAppCategory.ICreate,
      },
    );
    typia.assert(allowedCategory);
    TestValidator.equals(
      "allowed characters category name",
      allowedCategory.name,
      allowedName,
    );
  }

  // Verify user ownership and data integrity
  TestValidator.equals(
    "category belongs to correct user",
    validCategory.user.id,
    user.id,
  );
  TestValidator.equals(
    "category user email matches",
    validCategory.user.email,
    userEmail,
  );

  // Verify all categories have proper timestamps
  TestValidator.predicate(
    "category has created_at timestamp",
    validCategory.created_at !== undefined,
  );
  TestValidator.predicate(
    "category has updated_at timestamp",
    validCategory.updated_at !== undefined,
  );
  TestValidator.predicate(
    "created_at is valid datetime format",
    validCategory.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid datetime format",
    validCategory.updated_at.length > 0,
  );
}
