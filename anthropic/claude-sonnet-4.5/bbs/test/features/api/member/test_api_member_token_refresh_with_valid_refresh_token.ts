import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test the complete member token refresh workflow using a valid refresh token.
 *
 * This test validates the seamless session continuation mechanism that allows
 * members to maintain authenticated sessions without re-entering credentials
 * when their access token expires. The test creates a new member account,
 * obtains initial tokens through join, then uses the refresh token to get a new
 * access token.
 *
 * Steps:
 *
 * 1. Create a new member account through join operation
 * 2. Extract refresh token from the join response
 * 3. Call the token refresh endpoint with the refresh token
 * 4. Validate new access token and expiration metadata
 * 5. Verify member information is included for client state sync
 */
export async function test_api_member_token_refresh_with_valid_refresh_token(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account to get initial tokens
  const joinData = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.IJoin;

  const joinedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: joinData,
    });
  typia.assert(joinedMember);

  // Step 2: Extract the refresh token from join response
  const refreshToken: string = joinedMember.token.refresh;
  TestValidator.predicate(
    "refresh token should exist",
    refreshToken.length > 0,
  );

  // Step 3: Use the refresh token to obtain new access token
  const refreshedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.refresh(connection, {
      body: {
        refreshToken: refreshToken,
      } satisfies IDiscussionBoardMember.IRefresh,
    });
  typia.assert(refreshedMember);

  // Step 4: Validate the new access token exists and has proper structure
  TestValidator.predicate(
    "new access token should exist",
    refreshedMember.token.access.length > 0,
  );
  TestValidator.predicate(
    "new refresh token should exist",
    refreshedMember.token.refresh.length > 0,
  );

  // Step 5: Validate token expiration metadata exists
  TestValidator.predicate(
    "access token expiration should be set",
    refreshedMember.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refresh token expiration should be set",
    refreshedMember.token.refreshable_until.length > 0,
  );

  // Step 6: Verify member information is included in response
  TestValidator.equals(
    "member ID should match",
    refreshedMember.id,
    joinedMember.id,
  );
  TestValidator.equals(
    "member username should match",
    refreshedMember.username,
    joinedMember.username,
  );
  TestValidator.equals(
    "member email should match",
    refreshedMember.email,
    joinedMember.email,
  );
}
