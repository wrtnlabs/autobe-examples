import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test member login failure when providing incorrect email or password
 * credentials. This scenario validates the platform's authentication security
 * by attempting to login with invalid combinations of email and password. The
 * test verifies that incorrect credentials are rejected with appropriate error
 * responses, ensuring that unauthorized access attempts are properly
 * prevented.
 */
export async function test_api_member_login_invalid_credentials(
  connection: api.IConnection,
) {
  // Step 1: Create a valid member account to establish correct credentials baseline
  const validEmail = typia.random<string & tags.Format<"email">>();
  const validPassword = "ValidPass123"; // 11 characters, meets MinLength<8>

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: validEmail,
      password: validPassword,
      display_name: RandomGenerator.name(),
      ip: undefined,
      href: "https://example.com/auth/register",
      referrer: "https://example.com/",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Test login failure with incorrect email but correct password
  await TestValidator.error(
    "login should fail with incorrect email",
    async () => {
      await api.functional.auth.member.login(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(), // Different email
          password: validPassword, // Correct password
          ip: undefined,
          href: "https://example.com/auth/login",
          referrer: "https://example.com/",
        } satisfies ICommunityPlatformMember.ILogin,
      });
    },
  );

  // Step 3: Test login failure with correct email but incorrect password
  await TestValidator.error(
    "login should fail with incorrect password",
    async () => {
      await api.functional.auth.member.login(connection, {
        body: {
          email: validEmail, // Correct email
          password: "WrongPass456", // Different password (11 characters)
          ip: undefined,
          href: "https://example.com/auth/login",
          referrer: "https://example.com/",
        } satisfies ICommunityPlatformMember.ILogin,
      });
    },
  );

  // Step 4: Test login failure with both incorrect email and password
  await TestValidator.error(
    "login should fail with both incorrect email and password",
    async () => {
      await api.functional.auth.member.login(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(), // Different email
          password: "AnotherPass789", // Different password (12 characters)
          ip: undefined,
          href: "https://example.com/auth/login",
          referrer: "https://example.com/",
        } satisfies ICommunityPlatformMember.ILogin,
      });
    },
  );

  // Step 5: Verify that valid credentials still work (sanity check)
  const validLogin = await api.functional.auth.member.login(connection, {
    body: {
      email: validEmail,
      password: validPassword,
      ip: undefined,
      href: "https://example.com/auth/login",
      referrer: "https://example.com/",
    } satisfies ICommunityPlatformMember.ILogin,
  });
  typia.assert(validLogin);
  TestValidator.equals(
    "valid login should return member data",
    validLogin.email,
    validEmail,
  );
}
