import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test registration rejection with malformed email addresses.
 *
 * Validates email format validation including missing @ symbol, invalid domain
 * formats, and improper email syntax to ensure only deliverable email addresses
 * are accepted. This test will verify that the `/auth/user/join` endpoint
 * properly rejects various malformed email formats while accepting valid email
 * formats, ensuring robust email validation is implemented.
 */
export async function test_api_user_registration_invalid_email_format(
  connection: api.IConnection,
) {
  // Test valid email format first (baseline)
  const validEmail = typia.random<string & tags.Format<"email">>();
  const validRegistration = await api.functional.auth.user.join(connection, {
    body: {
      email: validEmail,
      password: RandomGenerator.alphaNumeric(12),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(validRegistration);

  // Test case 1: Missing @ symbol
  await TestValidator.error(
    "should reject email without @ symbol",
    async () => {
      await api.functional.auth.user.join(connection, {
        body: {
          email: "userexample.com",
          password: RandomGenerator.alphaNumeric(12),
          href: "https://example.com/register",
          referrer: "https://example.com",
        } satisfies ITodoAppUser.IJoin,
      });
    },
  );

  // Test case 2: Missing domain part
  await TestValidator.error("should reject email without domain", async () => {
    await api.functional.auth.user.join(connection, {
      body: {
        email: "user@",
        password: RandomGenerator.alphaNumeric(12),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ITodoAppUser.IJoin,
    });
  });

  // Test case 3: Missing local part
  await TestValidator.error(
    "should reject email without local part",
    async () => {
      await api.functional.auth.user.join(connection, {
        body: {
          email: "@example.com",
          password: RandomGenerator.alphaNumeric(12),
          href: "https://example.com/register",
          referrer: "https://example.com",
        } satisfies ITodoAppUser.IJoin,
      });
    },
  );

  // Test case 4: Invalid domain format
  await TestValidator.error(
    "should reject email with invalid domain format",
    async () => {
      await api.functional.auth.user.join(connection, {
        body: {
          email: "user@-example.com",
          password: RandomGenerator.alphaNumeric(12),
          href: "https://example.com/register",
          referrer: "https://example.com",
        } satisfies ITodoAppUser.IJoin,
      });
    },
  );

  // Test case 5: Domain with invalid characters
  await TestValidator.error(
    "should reject email with domain containing invalid characters",
    async () => {
      await api.functional.auth.user.join(connection, {
        body: {
          email: "user@exam ple.com",
          password: RandomGenerator.alphaNumeric(12),
          href: "https://example.com/register",
          referrer: "https://example.com",
        } satisfies ITodoAppUser.IJoin,
      });
    },
  );

  // Test case 6: Local part with invalid characters
  await TestValidator.error(
    "should reject email with local part containing invalid characters",
    async () => {
      await api.functional.auth.user.join(connection, {
        body: {
          email: "user name@example.com",
          password: RandomGenerator.alphaNumeric(12),
          href: "https://example.com/register",
          referrer: "https://example.com",
        } satisfies ITodoAppUser.IJoin,
      });
    },
  );

  // Test case 7: Multiple @ symbols
  await TestValidator.error(
    "should reject email with multiple @ symbols",
    async () => {
      await api.functional.auth.user.join(connection, {
        body: {
          email: "user@@example.com",
          password: RandomGenerator.alphaNumeric(12),
          href: "https://example.com/register",
          referrer: "https://example.com",
        } satisfies ITodoAppUser.IJoin,
      });
    },
  );

  // Test case 8: Domain without TLD
  await TestValidator.error("should reject email without TLD", async () => {
    await api.functional.auth.user.join(connection, {
      body: {
        email: "user@example",
        password: RandomGenerator.alphaNumeric(12),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ITodoAppUser.IJoin,
    });
  });
}
