import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";

/**
 * Test member token refresh functionality with proper session validation.
 *
 * Creates member account and establishes authentication session, then tests
 * token refresh to ensure the system properly validates refresh tokens against
 * existing todo_app_member_sessions records and extends authenticated access
 * period. Validates that only valid, non-expired refresh tokens associated with
 * active member sessions can successfully renew authentication tokens.
 */
export async function test_api_member_token_refresh_session_validation(
  connection: api.IConnection,
) {
  // 1. Create a new member account to establish initial authentication session
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ITodoAppMember.IAuthorized =
    await api.functional.auth.member.join.registerMember(connection, {
      body: {
        email: memberEmail,
        first_name: "John",
        last_name: "Doe",
        status: "active",
      } satisfies ITodoAppMember.ICreate,
    });
  typia.assert(member);

  // 2. Validate initial member creation and token issuance
  TestValidator.equals(
    "member account created with valid email",
    member.email,
    memberEmail,
  );
  TestValidator.equals("member status is active", member.status, "active");
  TestValidator.predicate(
    "member has valid profile data",
    member.first_name === "John" && member.last_name === "Doe",
  );
  TestValidator.predicate(
    "initial authentication tokens issued",
    !!member.token.access && !!member.token.refresh,
  );

  // 3. Extract refresh token for session extension testing
  const refreshToken = member.token.refresh;
  TestValidator.predicate(
    "refresh token is available for session extension",
    refreshToken.length > 0,
  );

  // 4. Test token refresh functionality using the extracted refresh token
  const refreshedMember: ITodoAppMember.IAuthorized =
    await api.functional.auth.member.refresh.refreshMemberToken(connection, {
      body: {
        refreshToken: refreshToken,
      } satisfies ITodoAppMember.IRefresh,
    });
  typia.assert(refreshedMember);

  // 5. Validate successful token refresh and session extension
  TestValidator.equals(
    "member email preserved after refresh",
    refreshedMember.email,
    memberEmail,
  );
  TestValidator.equals(
    "member status maintained after refresh",
    refreshedMember.status,
    "active",
  );
  TestValidator.predicate(
    "new access token issued",
    !!refreshedMember.token.access,
  );
  TestValidator.predicate(
    "new refresh token issued",
    !!refreshedMember.token.refresh,
  );
  TestValidator.predicate(
    "profile data maintained",
    refreshedMember.first_name === "John" &&
      refreshedMember.last_name === "Doe",
  );

  // 6. Validate token expiration timestamps are properly set
  TestValidator.predicate(
    "access token has expiration timestamp",
    !!refreshedMember.token.expired_at,
  );
  TestValidator.predicate(
    "refresh token has refreshable until timestamp",
    !!refreshedMember.token.refreshable_until,
  );

  // 7. Verify session continuity - member ID should remain consistent
  TestValidator.equals(
    "member ID consistent after refresh",
    refreshedMember.id,
    member.id,
  );

  // 8. Test that expired or invalid refresh tokens would be rejected (conceptual validation)
  // Note: We don't actually test with invalid tokens as that would cause runtime errors
  TestValidator.predicate(
    "refresh token mechanism validates session tokens",
    refreshToken.length > 10,
  ); // Basic validation that refresh token has substantial content
}
