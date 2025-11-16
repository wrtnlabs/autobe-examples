import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";

/**
 * Test successful login of an existing member using valid email and password
 * credentials. This test validates the authentication process including JWT
 * token generation and session establishment.
 *
 * Test workflow:
 *
 * 1. Create a member account using the join API to establish valid credentials
 * 2. Use the same email and password to login through the login API
 * 3. Validate that the login response contains complete member profile information
 * 4. Verify that JWT tokens are properly generated for accessing protected
 *    features
 * 5. Confirm that all member data matches the registration information
 * 6. Validate timestamps, IDs, and data integrity
 *
 * The test ensures that successful login enables immediate access to
 * member-specific operations like content creation, voting, and community
 * participation within the Reddit Community platform.
 */
export async function test_api_member_login_success_existing_user(
  connection: api.IConnection,
) {
  // Generate valid member registration data
  const email = typia.random<string & tags.Format<"email">>();
  const nickname = RandomGenerator.name();
  const password = "securePassword123!";

  // Create member account to establish credentials
  const createdMember = await api.functional.auth.member.join(connection, {
    body: {
      email,
      nickname,
      password,
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(createdMember);

  // Store original member data for comparison
  const originalMemberData = {
    id: createdMember.id,
    email: createdMember.email,
    nickname: createdMember.nickname,
    created_at: createdMember.created_at,
    updated_at: createdMember.updated_at,
  };

  // Perform login with the same credentials
  const loginResponse = await api.functional.auth.member.login(connection, {
    body: {
      email,
      password,
      href: "https://example.com/login",
      referrer: "https://example.com/home",
      ip: "192.168.1.1",
    } satisfies IRedditCommunityMember.ILoginRequest,
  });
  typia.assert(loginResponse);

  // Validate login response contains all required member information
  TestValidator.equals(
    "member ID should match",
    loginResponse.id,
    originalMemberData.id,
  );
  TestValidator.equals(
    "email should match",
    loginResponse.email,
    originalMemberData.email,
  );
  TestValidator.equals(
    "nickname should match",
    loginResponse.nickname,
    originalMemberData.nickname,
  );
  TestValidator.equals(
    "created_at should match",
    loginResponse.created_at,
    originalMemberData.created_at,
  );
  TestValidator.equals(
    "updated_at should match",
    loginResponse.updated_at,
    originalMemberData.updated_at,
  );

  // Validate JWT tokens are properly generated
  TestValidator.predicate(
    "access token should exist",
    loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should exist",
    loginResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token should be JWT format",
    loginResponse.token.access.split(".").length === 3,
  );
  TestValidator.predicate(
    "refresh token should be JWT format",
    loginResponse.token.refresh.split(".").length === 3,
  );

  // Validate token expiration timestamps
  TestValidator.predicate(
    "expired_at should be future date",
    new Date(loginResponse.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refreshable_until should be future date",
    new Date(loginResponse.token.refreshable_until) > new Date(),
  );

  // Validate member status and integrity
  TestValidator.predicate(
    "deleted_at should be null or undefined",
    loginResponse.deleted_at === null || loginResponse.deleted_at === undefined,
  );
  TestValidator.predicate(
    "all timestamps should be valid ISO format",
    typia.is<string & tags.Format<"date-time">>(loginResponse.created_at) &&
      typia.is<string & tags.Format<"date-time">>(loginResponse.updated_at) &&
      typia.is<string & tags.Format<"date-time">>(
        loginResponse.token.expired_at,
      ) &&
      typia.is<string & tags.Format<"date-time">>(
        loginResponse.token.refreshable_until,
      ),
  );

  // Validate that authentication enables access to protected features
  TestValidator.predicate(
    "authorization header should be set after login",
    connection.headers?.Authorization === loginResponse.token.access,
  );

  // Test with referrer URL
  const loginWithReferrer = await api.functional.auth.member.login(connection, {
    body: {
      email,
      password,
      href: "https://example.com/login",
      referrer: "https://example.com/register",
      ip: null, // Test with null IP
    } satisfies IRedditCommunityMember.ILoginRequest,
  });
  typia.assert(loginWithReferrer);

  TestValidator.equals(
    "member data should remain consistent",
    loginWithReferrer.id,
    originalMemberData.id,
  );
  TestValidator.predicate(
    "login should work with null IP",
    loginWithReferrer.token.access.length > 0,
  );
}
