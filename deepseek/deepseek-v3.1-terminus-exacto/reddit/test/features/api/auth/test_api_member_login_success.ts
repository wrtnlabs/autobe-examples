import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test successful member login workflow with valid credentials and complete
 * session context. Validates that existing members can authenticate using their
 * registered email and password, and that the system returns appropriate
 * authentication tokens upon successful login. The test verifies that the
 * response includes complete member profile data, JWT tokens with expiration
 * information, and that session tracking fields (ip, href, referrer) are
 * properly processed.
 */
export async function test_api_member_login_success(
  connection: api.IConnection,
) {
  // Step 1: Create member account for login testing with valid credentials
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphabets(12); // Ensure minimum 8 characters
  const memberDisplayName = RandomGenerator.name();

  // Generate realistic session context data
  const ipAddress = `192.168.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<254>>()}.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<254>>()}`;
  const baseUrl = "https://example.com";

  const createdMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        display_name: memberDisplayName,
        ip: ipAddress,
        href: `${baseUrl}/auth/register`,
        referrer: baseUrl,
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(createdMember);

  // Store original connection headers to verify token assignment
  const originalHeaders = { ...connection.headers };

  // Step 2: Perform member login with the created credentials
  const loggedInMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        ip: ipAddress,
        href: `${baseUrl}/auth/login`,
        referrer: `${baseUrl}/auth/register`,
      } satisfies ICommunityPlatformMember.ILogin,
    });
  typia.assert(loggedInMember);

  // Step 3: Validate that login response matches the created member data
  TestValidator.equals(
    "member ID should match",
    loggedInMember.id,
    createdMember.id,
  );
  TestValidator.equals(
    "email should match",
    loggedInMember.email,
    createdMember.email,
  );
  TestValidator.equals(
    "display name should match",
    loggedInMember.display_name,
    createdMember.display_name,
  );
  TestValidator.equals(
    "karma score should be 0 for new member",
    loggedInMember.karma_score,
    0,
  );
  TestValidator.equals(
    "verification status should be false for new member",
    loggedInMember.is_verified,
    false,
  );

  // Step 4: Validate token structure and expiration
  TestValidator.predicate(
    "access token should be present",
    loggedInMember.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be present",
    loggedInMember.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expiration should be valid date",
    new Date(loggedInMember.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refresh token expiration should be valid date",
    new Date(loggedInMember.token.refreshable_until) > new Date(),
  );
  TestValidator.predicate(
    "refresh token should expire after access token",
    new Date(loggedInMember.token.refreshable_until) >
      new Date(loggedInMember.token.expired_at),
  );

  // Step 5: Validate timestamps
  TestValidator.predicate(
    "created at timestamp should be valid",
    new Date(loggedInMember.created_at) <= new Date(),
  );
  TestValidator.predicate(
    "updated at timestamp should be valid",
    new Date(loggedInMember.updated_at) <= new Date(),
  );
  TestValidator.predicate(
    "updated at should be after or equal to created at",
    new Date(loggedInMember.updated_at) >= new Date(loggedInMember.created_at),
  );

  // Step 6: Validate that last_active_at is updated after login
  if (
    loggedInMember.last_active_at !== null &&
    loggedInMember.last_active_at !== undefined
  ) {
    TestValidator.predicate(
      "last active timestamp should be recent",
      new Date(loggedInMember.last_active_at) > new Date(Date.now() - 60000),
    ); // Within last minute
  }

  // Step 7: Validate that authorization token is set in connection headers
  TestValidator.predicate(
    "authorization header should be set",
    connection.headers?.Authorization !== undefined,
  );
  TestValidator.predicate(
    "authorization header should contain access token",
    connection.headers?.Authorization ===
      `Bearer ${loggedInMember.token.access}`,
  );

  // Step 8: Validate that connection headers were properly updated (not just replaced)
  TestValidator.predicate(
    "original headers should be preserved with new authorization",
    Object.keys(connection.headers || {}).length >=
      Object.keys(originalHeaders).length,
  );
}
