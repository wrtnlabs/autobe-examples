import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";

export async function test_api_member_token_refresh_after_initial_login(
  connection: api.IConnection,
) {
  // Generate random member data for testing
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePassword123!";
  const memberFirstName = RandomGenerator.name(1);
  const memberLastName = RandomGenerator.name(1);

  // Step 1: Create new member account
  const createdMember = await api.functional.auth.member.join.registerMember(
    connection,
    {
      body: {
        email: memberEmail,
        first_name: memberFirstName,
        last_name: memberLastName,
        status: "active",
      } satisfies ITodoAppMember.ICreate,
    },
  );
  typia.assert(createdMember);

  // Validate member account creation
  TestValidator.equals(
    "created member email matches input",
    createdMember.email,
    memberEmail,
  );
  TestValidator.equals(
    "created member has active status",
    createdMember.status,
    "active",
  );
  TestValidator.equals(
    "created member has first name",
    createdMember.first_name,
    memberFirstName,
  );

  // Step 2: Authenticate member to establish initial session
  const loginResponse =
    await api.functional.auth.member.login.authenticateMember(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        href: "https://todoapp.test/login",
        referrer: "https://todoapp.test/home",
      } satisfies ITodoAppMember.ILogin,
    });
  typia.assert(loginResponse);

  // Validate login response
  TestValidator.equals(
    "login response email matches member email",
    loginResponse.email,
    memberEmail,
  );
  TestValidator.equals(
    "login response has access token",
    loginResponse.token.access,
    loginResponse.token.access,
  );
  TestValidator.equals(
    "login response has refresh token",
    loginResponse.token.refresh,
    loginResponse.token.refresh,
  );
  TestValidator.predicate(
    "access token has valid format",
    loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token has valid format",
    loginResponse.token.refresh.length > 0,
  );

  // Store original tokens for comparison
  const originalAccessToken = loginResponse.token.access;
  const originalRefreshToken = loginResponse.token.refresh;

  // Step 3: Test token refresh functionality
  const refreshResponse =
    await api.functional.auth.member.refresh.refreshMemberToken(connection, {
      body: {
        refreshToken: originalRefreshToken,
      } satisfies ITodoAppMember.IRefresh,
    });
  typia.assert(refreshResponse);

  // Validate refresh response
  TestValidator.equals(
    "refresh response email matches member email",
    refreshResponse.email,
    memberEmail,
  );
  TestValidator.equals(
    "refresh response has new access token",
    refreshResponse.token.access,
    refreshResponse.token.access,
  );
  TestValidator.equals(
    "refresh response has refresh token",
    refreshResponse.token.refresh,
    refreshResponse.token.refresh,
  );

  // Validate token rotation and freshness
  TestValidator.notEquals(
    "new access token differs from original",
    refreshResponse.token.access,
    originalAccessToken,
  );
  TestValidator.predicate(
    "new access token has valid format",
    refreshResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token rotation maintains format",
    refreshResponse.token.refresh.length > 0,
  );

  // Validate token expiration times
  TestValidator.predicate(
    "access token has expiration time",
    refreshResponse.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refresh token has refreshable until time",
    refreshResponse.token.refreshable_until.length > 0,
  );

  // Step 4: Test multiple refresh operations to ensure consistency
  const secondRefreshResponse =
    await api.functional.auth.member.refresh.refreshMemberToken(connection, {
      body: {
        refreshToken: refreshResponse.token.refresh,
      } satisfies ITodoAppMember.IRefresh,
    });
  typia.assert(secondRefreshResponse);

  // Validate second refresh operation
  TestValidator.equals(
    "second refresh maintains email",
    secondRefreshResponse.email,
    memberEmail,
  );
  TestValidator.notEquals(
    "second refresh generates new access token",
    secondRefreshResponse.token.access,
    refreshResponse.token.access,
  );
  TestValidator.predicate(
    "second refresh token remains valid",
    secondRefreshResponse.token.refresh.length > 0,
  );

  // Final validation of member identity consistency
  TestValidator.equals(
    "member ID remains consistent after refresh",
    refreshResponse.id,
    createdMember.id,
  );
  TestValidator.equals(
    "member profile data remains consistent",
    refreshResponse.first_name,
    memberFirstName,
  );
  TestValidator.equals(
    "member status remains active",
    refreshResponse.status,
    "active",
  );
}
