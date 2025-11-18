import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppCategory";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_category_creation_boundaries(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user for testing
  const email = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password: "password123",
      ip: "127.0.0.1", // Fixed: Plain string, not fictional ipv4 format
      href: "https://example.com",
      referrer: "https://google.com",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);

  // Step 2: Test minimum length category name (2 characters)
  const minName = "AB";
  const minNameCategory = await api.functional.todoApp.user.categories.create(
    connection,
    {
      body: {
        name: minName,
        description: null,
      } satisfies ITodoAppCategory.ICreate,
    },
  );
  typia.assert(minNameCategory);
  TestValidator.equals(
    "minimum name length is 2 characters",
    minNameCategory.name,
    minName,
  );
  TestValidator.equals(
    "description is null",
    minNameCategory.description,
    null,
  );

  // Step 3: Test maximum length category name (50 characters)
  const maxName = ArrayUtil.repeat(50, () => "A").join("");
  const maxNameCategory = await api.functional.todoApp.user.categories.create(
    connection,
    {
      body: {
        name: maxName,
        description: "Maximum length category name",
      } satisfies ITodoAppCategory.ICreate,
    },
  );
  typia.assert(maxNameCategory);
  TestValidator.equals(
    "maximum name length is 50 characters",
    maxNameCategory.name,
    maxName,
  );
  TestValidator.equals(
    "description matches input",
    maxNameCategory.description,
    "Maximum length category name",
  );

  // Step 4: Test category name with special characters (should fail)
  const specialCharName = "@#$%&";
  await TestValidator.error(
    // Fixed: Added await
    "category name with special characters should fail",
    async () => {
      await api.functional.todoApp.user.categories.create(connection, {
        body: {
          name: specialCharName,
          description: "Special characters test",
        } satisfies ITodoAppCategory.ICreate,
      });
    },
  );

  // Step 5: Test allowed special characters (space, hyphen)
  const allowedCharsNames = [
    "Valid Name",
    "Valid-Name",
    "Valid Name 123",
    "Valid-Name-123",
  ] as const;

  for (const name of allowedCharsNames) {
    const category = await api.functional.todoApp.user.categories.create(
      connection,
      {
        body: {
          name: name as string, // Fixed: Explicit cast to avoid any issues
          description: "Allowed special characters test",
        } satisfies ITodoAppCategory.ICreate,
      },
    );
    typia.assert(category);
    TestValidator.equals(
      "category name accepts allowed special characters",
      category.name,
      name,
    );
  }

  // Step 6: Test null description
  const nullDescCategory = await api.functional.todoApp.user.categories.create(
    connection,
    {
      body: {
        name: "Null Description Category",
        description: null,
      } satisfies ITodoAppCategory.ICreate,
    },
  );
  typia.assert(nullDescCategory);
  TestValidator.equals(
    "null description is accepted",
    nullDescCategory.description,
    null,
  );

  // Step 7: Test undefined description
  const undefinedDescCategory =
    await api.functional.todoApp.user.categories.create(connection, {
      body: {
        name: "Undefined Description Category",
      } satisfies ITodoAppCategory.ICreate,
    });
  typia.assert(undefinedDescCategory);
  TestValidator.equals(
    "undefined description is accepted",
    undefinedDescCategory.description,
    undefined,
  );

  // Step 8: Test category name length boundary violations
  const tooShortName = "A"; // 1 character
  await TestValidator.error(
    // Fixed: Added await
    "category name too short should fail",
    async () => {
      await api.functional.todoApp.user.categories.create(connection, {
        body: {
          name: tooShortName,
          description: "Too short name",
        } satisfies ITodoAppCategory.ICreate,
      });
    },
  );

  const tooLongName = ArrayUtil.repeat(51, () => "A").join(""); // 51 characters
  await TestValidator.error(
    // Fixed: Added await
    "category name too long should fail",
    async () => {
      await api.functional.todoApp.user.categories.create(connection, {
        body: {
          name: tooLongName,
          description: "Too long name",
        } satisfies ITodoAppCategory.ICreate,
      });
    },
  );
}
