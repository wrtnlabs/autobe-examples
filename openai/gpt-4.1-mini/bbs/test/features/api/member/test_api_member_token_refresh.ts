import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Validate member user join and refresh token operations.
 *
 * This test ensures that a member user can successfully join the discussion
 * board, and then use their refresh token to obtain new JWT access tokens. The
 * test performs the following steps:
 *
 * 1. Create a new member user account by calling the join API with valid data.
 * 2. Assert that the returned IAuthorized object contains valid fields and tokens.
 * 3. Extract the refresh token from the join response.
 * 4. Call the refresh API with the refresh token.
 * 5. Assert that the refresh response is valid and has matching member data.
 * 6. Verify that the token fields have been updated and differ from the original.
 */
export async function test_api_member_token_refresh(
  connection: api.IConnection,
) {
  // 1. Create a new member user account
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const displayName = RandomGenerator.name();

  const joinRequestBody = {
    email,
    password,
    display_name: displayName,
  } satisfies IDiscussionBoardMember.ICreate;

  const joinResponse: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: joinRequestBody,
    });
  typia.assert(joinResponse);

  // 2. Check essential fields
  TestValidator.predicate(
    "joinResponse has non-empty id",
    joinResponse.id !== undefined &&
      joinResponse.id !== null &&
      joinResponse.id.length > 0,
  );
  TestValidator.equals("joinResponse email matches", joinResponse.email, email);
  TestValidator.equals(
    "joinResponse display_name matches",
    joinResponse.display_name,
    displayName,
  );

  // 3. Extract refresh token
  const originalRefreshToken = joinResponse.token.refresh;

  TestValidator.predicate(
    "joinResponse token.refresh is non-empty",
    originalRefreshToken.length > 0,
  );

  // 4. Call refresh API
  const refreshRequestBody = {
    refresh_token: originalRefreshToken,
    token_type: "refresh",
  } satisfies IDiscussionBoardMember.IRefresh;

  const refreshResponse: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.refresh(connection, {
      body: refreshRequestBody,
    });
  typia.assert(refreshResponse);

  // 5. Assert matching user id and email
  TestValidator.equals(
    "refreshResponse id matches joinResponse",
    refreshResponse.id,
    joinResponse.id,
  );
  TestValidator.equals(
    "refreshResponse email matches joinResponse",
    refreshResponse.email,
    joinResponse.email,
  );
  TestValidator.equals(
    "refreshResponse display_name matches joinResponse",
    refreshResponse.display_name,
    joinResponse.display_name,
  );

  // 6. Verify that refresh token has changed and access token has changed
  TestValidator.notEquals(
    "refreshResponse token.access differs from joinResponse",
    refreshResponse.token.access,
    joinResponse.token.access,
  );
  TestValidator.notEquals(
    "refreshResponse token.refresh differs from joinResponse",
    refreshResponse.token.refresh,
    joinResponse.token.refresh,
  );

  // 7. Validate token expiry fields are valid ISO date strings
  const expiredAtDate = Date.parse(refreshResponse.token.expired_at);
  TestValidator.predicate(
    "token.expired_at is a valid ISO date",
    !isNaN(expiredAtDate),
  );

  const refreshableUntilDate = Date.parse(
    refreshResponse.token.refreshable_until,
  );
  TestValidator.predicate(
    "token.refreshable_until is a valid ISO date",
    !isNaN(refreshableUntilDate),
  );
}
