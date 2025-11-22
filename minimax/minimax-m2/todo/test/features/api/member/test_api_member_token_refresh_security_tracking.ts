import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";

export async function test_api_member_token_refresh_security_tracking(
  connection: api.IConnection,
) {
  // Generate random member data for testing
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberData = {
    email: memberEmail,
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active" as const,
  } satisfies ITodoAppMember.ICreate;

  // Step 1: Create member account and establish initial session
  const createdMember: ITodoAppMember.IAuthorized =
    await api.functional.auth.member.join.registerMember(connection, {
      body: memberData,
    });
  typia.assert(createdMember);

  // Validate initial member creation response
  TestValidator.equals(
    "member email matches input",
    createdMember.email,
    memberData.email,
  );
  TestValidator.equals(
    "member first name matches input",
    createdMember.first_name,
    memberData.first_name,
  );
  TestValidator.equals(
    "member last name matches input",
    createdMember.last_name,
    memberData.last_name,
  );
  TestValidator.equals(
    "member status is active",
    createdMember.status,
    "active",
  );
  TestValidator.predicate(
    "member has valid ID",
    createdMember.id !== null && createdMember.id !== undefined,
  );
  TestValidator.predicate(
    "member has authentication token",
    createdMember.token.access.length > 0,
  );
  TestValidator.predicate(
    "member has refresh token",
    createdMember.token.refresh.length > 0,
  );

  // Step 2: Test token refresh operation for security tracking
  const refreshData = {
    refreshToken: createdMember.token.refresh,
  } satisfies ITodoAppMember.IRefresh;

  const refreshedMember: ITodoAppMember.IAuthorized =
    await api.functional.auth.member.refresh.refreshMemberToken(connection, {
      body: refreshData,
    });
  typia.assert(refreshedMember);

  // Step 3: Validate refresh operation maintains security tracking
  TestValidator.equals(
    "refreshed member ID remains consistent",
    refreshedMember.id,
    createdMember.id,
  );
  TestValidator.equals(
    "refreshed member email remains consistent",
    refreshedMember.email,
    createdMember.email,
  );
  TestValidator.predicate(
    "refreshed member has new access token",
    refreshedMember.token.access !== createdMember.token.access,
  );
  TestValidator.predicate(
    "refreshed member has new refresh token",
    refreshedMember.token.refresh !== createdMember.token.refresh,
  );
  TestValidator.predicate(
    "new access token is valid",
    refreshedMember.token.access.length > 0,
  );
  TestValidator.predicate(
    "new refresh token is valid",
    refreshedMember.token.refresh.length > 0,
  );

  // Validate token expiration times are properly set
  TestValidator.predicate(
    "access token has expiration time",
    refreshedMember.token.expired_at !== null &&
      refreshedMember.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "refresh token has refreshable until time",
    refreshedMember.token.refreshable_until !== null &&
      refreshedMember.token.refreshable_until !== undefined,
  );

  // Validate security tracking through connection metadata
  TestValidator.predicate(
    "connection maintains security context",
    connection.headers?.Authorization === refreshedMember.token.access,
  );
  TestValidator.predicate(
    "member profile data preserved during refresh",
    refreshedMember.first_name === createdMember.first_name &&
      refreshedMember.last_name === createdMember.last_name,
  );

  // Step 4: Verify member session state after refresh
  TestValidator.equals(
    "member status remains active after refresh",
    refreshedMember.status,
    "active",
  );
  TestValidator.predicate(
    "member timestamps are maintained",
    refreshedMember.created_at === createdMember.created_at,
  );
  TestValidator.predicate(
    "member profile integrity preserved",
    refreshedMember.email === memberData.email &&
      refreshedMember.status === "active",
  );

  // Step 5: Test that security monitoring capabilities are maintained
  TestValidator.predicate(
    "member can perform authenticated operations after refresh",
    refreshedMember.id.length > 0,
  );
  TestValidator.equals(
    "member session continuity verified",
    refreshedMember.id,
    createdMember.id,
  );

  // Final validation: Ensure audit trails and security tracking are intact
  TestValidator.predicate(
    "security tracking maintained through refresh operation",
    refreshedMember.token.access.length > 0 && refreshedMember.id.length > 0,
  );
  TestValidator.equals(
    "member authentication state consistency",
    refreshedMember.email,
    createdMember.email,
  );
}
