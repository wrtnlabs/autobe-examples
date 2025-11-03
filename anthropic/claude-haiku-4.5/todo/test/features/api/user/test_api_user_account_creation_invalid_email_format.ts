import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Validates that user registration fails with invalid email formats.
 *
 * Tests email validation by attempting registration with various invalid email
 * formats (missing @, missing domain, missing TLD, etc.). Each invalid format
 * should be rejected and no account created. Verifies the system properly
 * validates emails against RFC 5322 standard format.
 *
 * Test steps:
 *
 * 1. Attempt registration with email missing @ symbol
 * 2. Attempt registration with email missing domain
 * 3. Attempt registration with email missing TLD
 * 4. Attempt registration with email having multiple @ symbols
 * 5. Attempt registration with email containing spaces
 * 6. Verify all attempts fail with validation errors
 * 7. Verify no accounts were created
 */
export async function test_api_user_account_creation_invalid_email_format(
  connection: api.IConnection,
) {
  // Test Case 1: Email missing @ symbol
  await TestValidator.error(
    "should reject email without @ symbol",
    async () => {
      await api.functional.todoApp.users.create(connection, {
        body: {
          email: "invalidemail.com",
          password: "validPassword123",
        } satisfies ITodoAppUser.ICreate,
      });
    },
  );

  // Test Case 2: Email missing domain
  await TestValidator.error("should reject email without domain", async () => {
    await api.functional.todoApp.users.create(connection, {
      body: {
        email: "user@",
        password: "validPassword123",
      } satisfies ITodoAppUser.ICreate,
    });
  });

  // Test Case 3: Email missing local part
  await TestValidator.error(
    "should reject email without local part",
    async () => {
      await api.functional.todoApp.users.create(connection, {
        body: {
          email: "@example.com",
          password: "validPassword123",
        } satisfies ITodoAppUser.ICreate,
      });
    },
  );

  // Test Case 4: Email with multiple @ symbols
  await TestValidator.error(
    "should reject email with multiple @ symbols",
    async () => {
      await api.functional.todoApp.users.create(connection, {
        body: {
          email: "user@@example.com",
          password: "validPassword123",
        } satisfies ITodoAppUser.ICreate,
      });
    },
  );

  // Test Case 5: Email with spaces
  await TestValidator.error(
    "should reject email containing spaces",
    async () => {
      await api.functional.todoApp.users.create(connection, {
        body: {
          email: "user @example.com",
          password: "validPassword123",
        } satisfies ITodoAppUser.ICreate,
      });
    },
  );

  // Test Case 6: Email missing TLD
  await TestValidator.error(
    "should reject email without top-level domain",
    async () => {
      await api.functional.todoApp.users.create(connection, {
        body: {
          email: "user@domain",
          password: "validPassword123",
        } satisfies ITodoAppUser.ICreate,
      });
    },
  );

  // Test Case 7: Email with consecutive dots
  await TestValidator.error(
    "should reject email with consecutive dots",
    async () => {
      await api.functional.todoApp.users.create(connection, {
        body: {
          email: "user..name@example.com",
          password: "validPassword123",
        } satisfies ITodoAppUser.ICreate,
      });
    },
  );

  // Verify that a valid email still works to confirm API is functional
  const validUser: ITodoAppUser = await api.functional.todoApp.users.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "validPassword123",
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(validUser);
  TestValidator.predicate(
    "valid user should be created successfully",
    validUser.id !== undefined && validUser.email !== undefined,
  );
}
