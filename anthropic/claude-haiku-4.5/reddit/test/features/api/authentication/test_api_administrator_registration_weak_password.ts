import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test administrator registration with weak passwords below security
 * requirements.
 *
 * Validates that the system enforces password security standards by rejecting
 * passwords that do not meet the minimum length requirement of 8 characters.
 * Tests multiple weak password scenarios to ensure consistent password
 * validation across different password patterns and lengths.
 *
 * Test workflow:
 *
 * 1. Attempt registration with password containing less than 8 characters
 * 2. Verify system rejects the registration with appropriate error
 * 3. Test multiple weak password scenarios (very short, single character, etc.)
 * 4. Confirm that proper credentials are still accepted for valid registration
 */
export async function test_api_administrator_registration_weak_password(
  connection: api.IConnection,
) {
  const baseEmail = typia.random<string & tags.Format<"email">>();
  const validUsername = RandomGenerator.name();
  const validName = RandomGenerator.name();
  const validHref = typia.random<string & tags.Format<"uri">>();

  // Test 1: Password with 7 characters (below 8 character minimum)
  await TestValidator.error(
    "should reject password with 7 characters",
    async () => {
      await api.functional.auth.administrator.join(connection, {
        body: {
          email: baseEmail,
          password: "1234567",
          username: validUsername,
          name: validName,
          href: validHref,
        } satisfies ICommunityPlatformAdministrator.ICreate,
      });
    },
  );

  // Test 2: Password with single character
  await TestValidator.error(
    "should reject password with single character",
    async () => {
      await api.functional.auth.administrator.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "a",
          username: RandomGenerator.name(),
          name: RandomGenerator.name(),
          href: validHref,
        } satisfies ICommunityPlatformAdministrator.ICreate,
      });
    },
  );

  // Test 3: Password with empty string
  await TestValidator.error("should reject empty password", async () => {
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "",
        username: RandomGenerator.name(),
        name: RandomGenerator.name(),
        href: validHref,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  });

  // Test 4: Password with 5 characters
  await TestValidator.error(
    "should reject password with 5 characters",
    async () => {
      await api.functional.auth.administrator.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "abcde",
          username: RandomGenerator.name(),
          name: RandomGenerator.name(),
          href: validHref,
        } satisfies ICommunityPlatformAdministrator.ICreate,
      });
    },
  );

  // Test 5: Password with exactly 8 characters (minimum valid length)
  const validPassword = RandomGenerator.alphaNumeric(8);
  const successEmail = typia.random<string & tags.Format<"email">>();
  const successUsername = RandomGenerator.name();
  const successName = RandomGenerator.name();

  const result: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: successEmail,
        password: validPassword,
        username: successUsername,
        name: successName,
        href: validHref,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });

  typia.assert(result);

  TestValidator.equals(
    "administrator email matches input",
    result.email,
    successEmail,
  );

  TestValidator.equals(
    "administrator username matches input",
    result.username,
    successUsername,
  );

  TestValidator.predicate(
    "administrator account is active",
    result.account_status === "active",
  );

  TestValidator.predicate(
    "authorization token is present",
    result.token !== null && result.token !== undefined,
  );

  TestValidator.predicate(
    "access token is not empty",
    result.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token is not empty",
    result.token.refresh.length > 0,
  );
}
