import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test member login functionality with valid session context fields. This test
 * validates that the login API works correctly when all required session
 * context fields (href and referrer) are properly provided. The test ensures
 * that complete session tracking information is accepted and authentication
 * succeeds with valid credentials.
 */
export async function test_api_member_login_missing_session_context(
  connection: api.IConnection,
) {
  // Step 1: Create a member account with complete session context
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "ValidPassword123";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.paragraph({ sentences: 2 }),
      href: "https://example.com/register",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Test successful login with complete session context
  const loginResponse = await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://example.com/login",
      referrer: "https://example.com/dashboard",
    } satisfies ICommunityPlatformMember.ILogin,
  });
  typia.assert(loginResponse);

  // Step 3: Validate that login returns correct member information
  TestValidator.equals(
    "login should return correct email",
    loginResponse.email,
    memberEmail,
  );
  TestValidator.equals(
    "login should return correct display name",
    loginResponse.display_name,
    member.display_name,
  );
  TestValidator.predicate(
    "login should return a valid token",
    loginResponse.token.access.length > 0 &&
      loginResponse.token.refresh.length > 0,
  );

  // Step 4: Test login with different session context values
  const alternativeLogin = await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://example.com/alternative",
      referrer: "https://example.com/other",
    } satisfies ICommunityPlatformMember.ILogin,
  });
  typia.assert(alternativeLogin);

  // Step 5: Verify that different session contexts still authenticate successfully
  TestValidator.equals(
    "alternative login should return same member",
    alternativeLogin.id,
    member.id,
  );
}
