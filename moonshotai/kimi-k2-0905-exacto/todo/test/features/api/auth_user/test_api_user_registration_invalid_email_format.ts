import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test user registration with invalid email formats to ensure proper
 * validation. This test validates that the system rejects malformed email
 * addresses and generates appropriate errors when invalid email formats are
 * provided.
 */
export async function test_api_user_registration_invalid_email_format(
  connection: api.IConnection,
) {
  // Test Case 1: Email missing @ symbol
  const invalidEmail1 = "userexample.com";
  await TestValidator.error(
    "registration should reject email without @ symbol",
    async () => {
      await api.functional.auth.user.join(connection, {
        body: {
          email: invalidEmail1,
          password: "ValidPass123",
          href: "https://example.com/register",
          referrer: "https://example.com/",
        } satisfies ITodoAppUser.IJoin,
      });
    },
  );

  // Test Case 2: Email with multiple @ symbols
  const invalidEmail2 = "user@@example.com";
  await TestValidator.error(
    "registration should reject email with multiple @ symbols",
    async () => {
      await api.functional.auth.user.join(connection, {
        body: {
          email: invalidEmail2,
          password: "ValidPass123",
          href: "https://example.com/register",
          referrer: "https://example.com/",
        } satisfies ITodoAppUser.IJoin,
      });
    },
  );

  // Test Case 3: Email without domain part
  const invalidEmail3 = "user@";
  await TestValidator.error(
    "registration should reject email without domain part",
    async () => {
      await api.functional.auth.user.join(connection, {
        body: {
          email: invalidEmail3,
          password: "ValidPass123",
          href: "https://example.com/register",
          referrer: "https://example.com/",
        } satisfies ITodoAppUser.IJoin,
      });
    },
  );

  // Test Case 4: Email without local part
  const invalidEmail4 = "@example.com";
  await TestValidator.error(
    "registration should reject email without local part",
    async () => {
      await api.functional.auth.user.join(connection, {
        body: {
          email: invalidEmail4,
          password: "ValidPass123",
          href: "https://example.com/register",
          referrer: "https://example.com/",
        } satisfies ITodoAppUser.IJoin,
      });
    },
  );

  // Test Case 5: Email with invalid characters
  const invalidEmail5 = "user..name@example.com";
  await TestValidator.error(
    "registration should reject email with consecutive dots",
    async () => {
      await api.functional.auth.user.join(connection, {
        body: {
          email: invalidEmail5,
          password: "ValidPass123",
          href: "https://example.com/register",
          referrer: "https://example.com/",
        } satisfies ITodoAppUser.IJoin,
      });
    },
  );

  // Test Case 6: Email with space
  const invalidEmail6 = "user name@example.com";
  await TestValidator.error(
    "registration should reject email with spaces",
    async () => {
      await api.functional.auth.user.join(connection, {
        body: {
          email: invalidEmail6,
          password: "ValidPass123",
          href: "https://example.com/register",
          referrer: "https://example.com/",
        } satisfies ITodoAppUser.IJoin,
      });
    },
  );

  // Test Case 7: Just a string (no @ at all)
  const invalidEmail7 = "invalidemailformat";
  await TestValidator.error(
    "registration should reject when there is no @ symbol",
    async () => {
      await api.functional.auth.user.join(connection, {
        body: {
          email: invalidEmail7,
          password: "ValidPass123",
          href: "https://example.com/register",
          referrer: "https://example.com/",
        } satisfies ITodoAppUser.IJoin,
      });
    },
  );
}
