import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test member login behavior for accounts that have not completed email
 * verification.
 *
 * This scenario validates the platform's handling of unverified accounts during
 * authentication. The test creates an unverified member account and attempts to
 * login, verifying whether unverified accounts can login successfully or if
 * they receive restricted access, ensuring proper verification workflow
 * enforcement.
 */
export async function test_api_member_login_unverified_account(
  connection: api.IConnection,
) {
  // 1. Create unverified member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "Password123";

  const createdMember = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(createdMember);

  // Verify account is created but not verified
  TestValidator.equals(
    "account should be unverified",
    createdMember.is_verified,
    false,
  );

  // 2. Attempt to login with unverified account
  const loginResult = await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });
  typia.assert(loginResult);

  // 3. Validate login response
  TestValidator.equals("login email matches", loginResult.email, memberEmail);
  TestValidator.equals(
    "login display name matches",
    loginResult.display_name,
    createdMember.display_name,
  );
  TestValidator.equals(
    "verification status remains false",
    loginResult.is_verified,
    false,
  );

  // 4. Validate authorization token structure
  TestValidator.predicate(
    "token should have access field",
    typeof loginResult.token.access === "string",
  );
  TestValidator.predicate(
    "token should have refresh field",
    typeof loginResult.token.refresh === "string",
  );
  TestValidator.predicate(
    "token should have expired_at field",
    typeof loginResult.token.expired_at === "string",
  );
  TestValidator.predicate(
    "token should have refreshable_until field",
    typeof loginResult.token.refreshable_until === "string",
  );

  // 5. Verify token expiration dates are valid ISO strings
  TestValidator.predicate(
    "expired_at should be valid date",
    !isNaN(new Date(loginResult.token.expired_at).getTime()),
  );
  TestValidator.predicate(
    "refreshable_until should be valid date",
    !isNaN(new Date(loginResult.token.refreshable_until).getTime()),
  );

  // 6. Test error scenario: wrong password with unverified account
  await TestValidator.error("wrong password should fail", async () => {
    await api.functional.auth.member.login(connection, {
      body: {
        email: memberEmail,
        password: "WrongPassword123",
        href: "https://example.com/login",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ILogin,
    });
  });
}
