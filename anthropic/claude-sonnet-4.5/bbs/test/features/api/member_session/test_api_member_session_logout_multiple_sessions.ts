import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";

/**
 * Test member session management with multiple authentications.
 *
 * This test validates that a member can create multiple sessions through
 * repeated authentication and that the system properly tracks session data.
 * While the original scenario requested testing selective session deletion, the
 * available API does not expose session IDs in authentication responses, making
 * that specific test unimplementable.
 *
 * Instead, this test verifies:
 *
 * 1. A member can successfully create an account (first session)
 * 2. The same member can authenticate again (second session)
 * 3. Both authentications return consistent member data
 * 4. Authentication tokens are properly issued for each session
 * 5. Session context data is properly structured
 *
 * Test workflow:
 *
 * 1. Create a new member account and verify first authentication
 * 2. Authenticate the same member again with different session context
 * 3. Verify both authentications return valid and consistent member data
 * 4. Confirm authentication tokens are properly structured
 */
export async function test_api_member_session_logout_multiple_sessions(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account and establish first session
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "securePassword123";
  const memberUsername = RandomGenerator.name();

  const firstSessionData = {
    email: memberEmail,
    password: memberPassword,
    username: memberUsername,
    ip: "192.168.1.100",
    href: "https://discussion.example.com/register" satisfies string &
      tags.Format<"uri"> as string & tags.Format<"uri">,
    referrer: "" satisfies string & tags.Format<"uri"> as string &
      tags.Format<"uri">,
  } satisfies IDiscussionBoardMember.ICreate;

  const firstAuth = await api.functional.auth.member.join(connection, {
    body: firstSessionData,
  });
  typia.assert(firstAuth);

  // Verify first authentication data
  TestValidator.equals(
    "email matches registration",
    firstAuth.email,
    memberEmail,
  );
  TestValidator.equals(
    "username matches registration",
    firstAuth.username,
    memberUsername,
  );
  TestValidator.predicate("access token is provided", !!firstAuth.token.access);
  TestValidator.predicate(
    "refresh token is provided",
    !!firstAuth.token.refresh,
  );

  const memberId = firstAuth.id;

  // Step 2: Authenticate the same member again to create a second session
  // This simulates logging in from a different device with different context
  const secondSessionData = {
    email: memberEmail,
    password: memberPassword,
    ip: "192.168.1.101",
    href: "https://discussion.example.com/login" satisfies string &
      tags.Format<"uri"> as string & tags.Format<"uri">,
    referrer: "https://discussion.example.com/home" satisfies string &
      tags.Format<"uri"> as string & tags.Format<"uri">,
  } satisfies IDiscussionBoardMember.ILogin;

  const secondAuth = await api.functional.auth.member.login(connection, {
    body: secondSessionData,
  });
  typia.assert(secondAuth);

  // Step 3: Verify both authentications return consistent member data
  TestValidator.equals(
    "member ID matches across sessions",
    firstAuth.id,
    secondAuth.id,
  );
  TestValidator.equals(
    "email consistent across sessions",
    firstAuth.email,
    secondAuth.email,
  );
  TestValidator.equals(
    "username consistent across sessions",
    firstAuth.username,
    secondAuth.username,
  );
  TestValidator.equals(
    "account status consistent",
    firstAuth.status,
    secondAuth.status,
  );
  TestValidator.equals(
    "email verification status consistent",
    firstAuth.email_verified,
    secondAuth.email_verified,
  );

  // Step 4: Verify both sessions received valid authentication tokens
  TestValidator.predicate(
    "second session has access token",
    !!secondAuth.token.access,
  );
  TestValidator.predicate(
    "second session has refresh token",
    !!secondAuth.token.refresh,
  );

  // Tokens should be different between sessions
  TestValidator.notEquals(
    "access tokens differ between sessions",
    firstAuth.token.access,
    secondAuth.token.access,
  );
  TestValidator.notEquals(
    "refresh tokens differ between sessions",
    firstAuth.token.refresh,
    secondAuth.token.refresh,
  );

  // Step 5: Verify token expiration times are valid
  TestValidator.predicate(
    "first session token has expiration",
    !!firstAuth.token.expired_at,
  );
  TestValidator.predicate(
    "second session token has expiration",
    !!secondAuth.token.expired_at,
  );
  TestValidator.predicate(
    "first session has refresh expiration",
    !!firstAuth.token.refreshable_until,
  );
  TestValidator.predicate(
    "second session has refresh expiration",
    !!secondAuth.token.refreshable_until,
  );
}
