import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppCategory";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test category name validation edge cases including minimum length (2
 * characters), maximum length (50 characters), and invalid character rejection
 * for symbols or special characters.
 *
 * This test validates the category creation API's name constraints by testing:
 *
 * 1. Minimum boundary: 2 characters
 * 2. Maximum boundary: 50 characters
 * 3. Invalid character rejection: symbols and special characters
 * 4. Valid character acceptance: letters, numbers, spaces, and hyphens
 *
 * The test establishes user authentication first, then systematically tests
 * various category name formats to ensure the API enforces the documented
 * constraints.
 */
export async function test_api_category_creation_name_constraints(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user context
  const email = typia.random<string & tags.Format<"email">>();
  const joinData = {
    email,
    password: "ValidPass123!",
    ip: "127.0.0.1",
    href: "http://localhost:3000/join",
    referrer: "http://localhost:3000/",
  } satisfies ITodoAppUser.IJoin;

  const user = await api.functional.auth.user.join(connection, {
    body: joinData,
  });
  typia.assert(user);

  // Step 2: Test minimum length boundary - 2 characters
  const minLengthCategory = {
    name: "AB",
  } satisfies ITodoAppCategory.ICreate;
  const minLengthResult = await api.functional.todoApp.user.categories.create(
    connection,
    {
      body: minLengthCategory,
    },
  );
  typia.assert(minLengthResult);

  TestValidator.equals(
    "minimum length category name",
    minLengthResult.name,
    "AB",
  );

  // Step 3: Test maximum length boundary - 50 characters
  const maxLengthCategory = {
    name: typia.random<string & tags.MinLength<50> & tags.MaxLength<50>>(),
  } satisfies ITodoAppCategory.ICreate;
  const maxLengthResult = await api.functional.todoApp.user.categories.create(
    connection,
    {
      body: maxLengthCategory,
    },
  );
  typia.assert(maxLengthResult);
  TestValidator.equals(
    "maximum length category name",
    maxLengthResult.name.length,
    50,
  );

  // Step 4: Test valid character set - letters, numbers, spaces, hyphens
  const validCharCategory = {
    name: "Valid-Chars 123",
  } satisfies ITodoAppCategory.ICreate;
  const validCharResult = await api.functional.todoApp.user.categories.create(
    connection,
    {
      body: validCharCategory,
    },
  );
  typia.assert(validCharResult);
  TestValidator.equals(
    "valid characters category name",
    validCharResult.name,
    "Valid-Chars 123",
  );

  // Step 5: Test invalid character rejection - symbols and special characters
  const invalidCharCategory = {
    name: "Invalid@Chars!",
  } satisfies ITodoAppCategory.ICreate;

  await TestValidator.error(
    "invalid characters should be rejected",
    async () => {
      await api.functional.todoApp.user.categories.create(connection, {
        body: invalidCharCategory,
      });
    },
  );

  // Step 6: Test exceeding maximum length - 51 characters
  const tooLongCategory = {
    name: ArrayUtil.repeat(51, () =>
      RandomGenerator.pick([..."abcdefghijklmnopqrstuvwxyz"]),
    ).join(""),
  } satisfies ITodoAppCategory.ICreate;

  await TestValidator.error(
    "exceeding maximum length should be rejected",
    async () => {
      await api.functional.todoApp.user.categories.create(connection, {
        body: tooLongCategory,
      });
    },
  );

  // Step 7: Test below minimum length - 1 character
  const tooShortCategory = {
    name: "A",
  } satisfies ITodoAppCategory.ICreate;

  await TestValidator.error(
    "below minimum length should be rejected",
    async () => {
      await api.functional.todoApp.user.categories.create(connection, {
        body: tooShortCategory,
      });
    },
  );
}
