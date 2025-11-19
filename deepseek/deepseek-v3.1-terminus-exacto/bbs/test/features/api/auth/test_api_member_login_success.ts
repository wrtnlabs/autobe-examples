import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test successful member login workflow.
 *
 * This test validates the complete authentication flow for discussion board
 * members. It first registers a new member account with valid credentials, then
 * uses those same credentials to authenticate via the login endpoint. The test
 * ensures that login succeeds, returns proper authentication tokens with
 * expiration information, and provides complete member profile data matching
 * the registration response.
 */
export async function test_api_member_login_success(
  connection: api.IConnection,
) {
  // Generate random member registration data
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPassword123!";
  const memberUsername = RandomGenerator.name(1);
  const memberDisplayName = RandomGenerator.name();
  const memberBio = RandomGenerator.paragraph({ sentences: 3 });

  // Create registration request body
  const registrationBody = {
    email: memberEmail,
    username: memberUsername,
    password: memberPassword,
    display_name: memberDisplayName,
    bio: memberBio,
    href: "https://discussion-board.example.com/register",
    referrer: "https://discussion-board.example.com/",
  } satisfies IDiscussionBoardMember.ICreate;

  // Register new member account
  const registeredMember = await api.functional.auth.member.join(connection, {
    body: registrationBody,
  });
  typia.assert(registeredMember);

  // Create login request body using the same credentials
  const loginBody = {
    email: memberEmail,
    password: memberPassword,
    href: "https://discussion-board.example.com/login",
    referrer: "https://discussion-board.example.com/",
  } satisfies IDiscussionBoardMember.ILogin;

  // Authenticate using login endpoint
  const loggedInMember = await api.functional.auth.member.login(connection, {
    body: loginBody,
  });
  typia.assert(loggedInMember);

  // Validate that login response matches registration response structure
  TestValidator.equals(
    "member ID should match",
    loggedInMember.id,
    registeredMember.id,
  );
  TestValidator.equals(
    "email should match",
    loggedInMember.email,
    registeredMember.email,
  );
  TestValidator.equals(
    "username should match",
    loggedInMember.username,
    registeredMember.username,
  );
  TestValidator.equals(
    "display name should match",
    loggedInMember.display_name,
    registeredMember.display_name,
  );
  TestValidator.equals(
    "bio should match",
    loggedInMember.bio,
    registeredMember.bio,
  );
  TestValidator.equals(
    "created at should match",
    loggedInMember.created_at,
    registeredMember.created_at,
  );
  TestValidator.equals(
    "updated at should match",
    loggedInMember.updated_at,
    registeredMember.updated_at,
  );

  // Validate authentication token structure
  TestValidator.predicate(
    "access token should be present",
    loggedInMember.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be present",
    loggedInMember.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expiration should be valid date",
    new Date(loggedInMember.token.expired_at).getTime() > Date.now(),
  );
  TestValidator.predicate(
    "refreshable until should be valid date",
    new Date(loggedInMember.token.refreshable_until).getTime() > Date.now(),
  );

  // Validate token expiration logic
  const expiredAt = new Date(loggedInMember.token.expired_at);
  const refreshableUntil = new Date(loggedInMember.token.refreshable_until);
  TestValidator.predicate(
    "refreshable until should be after expired at",
    refreshableUntil > expiredAt,
  );
}
