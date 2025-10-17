import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test the complete token refresh workflow for an authenticated member.
 *
 * This test validates the core session continuation mechanism that enables
 * users to maintain long-lived sessions without frequent login prompts. The
 * workflow consists of two main steps:
 *
 * 1. Create a new member account through registration (join endpoint), which
 *    returns initial access and refresh tokens
 * 2. Use the refresh token to obtain a new access token without re-authentication
 *
 * The test verifies that:
 *
 * - New access token is returned with valid structure and updated expiration
 * - Token refresh succeeds with valid refresh token
 * - Member ID remains consistent between registration and token refresh
 * - All token fields follow proper format (JWT structure, ISO date-time)
 * - The authentication flow properly maintains session state
 */
export async function test_api_member_token_refresh_with_valid_refresh_token(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account through registration
  const registrationData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const registeredMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationData,
    });

  typia.assert(registeredMember);

  // Validate the initial authorization response structure
  TestValidator.predicate(
    "registered member has valid ID",
    typia.is<string & tags.Format<"uuid">>(registeredMember.id),
  );
  TestValidator.predicate(
    "registered member has token",
    registeredMember.token !== null && registeredMember.token !== undefined,
  );

  // Step 2: Use the refresh token to obtain new access token
  const refreshRequest = {
    refresh_token: registeredMember.token.refresh,
  } satisfies IDiscussionBoardMember.IRefresh;

  const refreshedAuth: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.refresh(connection, {
      body: refreshRequest,
    });

  typia.assert(refreshedAuth);

  // Step 3: Validate the refreshed authorization response
  TestValidator.equals(
    "member ID remains consistent after token refresh",
    refreshedAuth.id,
    registeredMember.id,
  );

  TestValidator.predicate(
    "refreshed token has valid access token",
    refreshedAuth.token.access.length > 0,
  );

  TestValidator.predicate(
    "refreshed token has valid refresh token",
    refreshedAuth.token.refresh.length > 0,
  );

  TestValidator.predicate(
    "access token expiration is valid date-time",
    typia.is<string & tags.Format<"date-time">>(refreshedAuth.token.expired_at),
  );

  TestValidator.predicate(
    "refresh token expiration is valid date-time",
    typia.is<string & tags.Format<"date-time">>(
      refreshedAuth.token.refreshable_until,
    ),
  );

  // Validate that new tokens are different from original (token rotation)
  TestValidator.notEquals(
    "new access token differs from original",
    refreshedAuth.token.access,
    registeredMember.token.access,
  );
}
