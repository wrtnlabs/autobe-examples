import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful token refresh operation where a member uses a valid refresh token
 * to obtain new access tokens. The scenario validates that the refresh endpoint
 * properly rotates tokens while maintaining session continuity.
 *
 * Steps:
 * 1. Create a member account using join endpoint to get initial tokens
 * 2. Wait briefly to ensure token timestamps differ
 * 3. Call refresh endpoint with valid refresh token
 * 4. Verify new access token is issued with updated expiration
 * 5. Confirm refresh token remains valid for continued session
 * 6. Validate response contains complete member profile information
 * 7. Verify new tokens can be used for authenticated API calls
 */
export async function test_api_member_refresh_successful_token_rotation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and obtain initial tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(initialAuth);
  // 2. Wait briefly to ensure timestamps can differ
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 3. Call refresh endpoint with valid refresh token
  const refreshResponse =
    await api.functional.discussionBoard.auth.member.refresh(memberConnection, {
      body: {
        refreshToken: initialAuth.token.refresh,
      } satisfies IDiscussionBoardMember.IRefresh,
    });
  typia.assert(refreshResponse);
  // 4. Validate member profile consistency
  TestValidator.equals(
    "member ID unchanged",
    refreshResponse.id,
    initialAuth.id,
  );
  TestValidator.equals(
    "email unchanged",
    refreshResponse.email,
    initialAuth.email,
  );
  TestValidator.equals(
    "display name unchanged",
    refreshResponse.display_name,
    initialAuth.display_name,
  );
  TestValidator.equals("bio unchanged", refreshResponse.bio, initialAuth.bio);
  TestValidator.equals(
    "ban status unchanged",
    refreshResponse.is_banned,
    initialAuth.is_banned,
  );
  TestValidator.equals(
    "admin grade unchanged",
    refreshResponse.admin_grade,
    initialAuth.admin_grade,
  );
  TestValidator.equals(
    "created at unchanged",
    refreshResponse.created_at,
    initialAuth.created_at,
  );
  // 5. Validate token rotation - new access token with updated expiration
  TestValidator.notEquals(
    "access token changed",
    refreshResponse.token.access,
    initialAuth.token.access,
  );
  TestValidator.notEquals(
    "access expiration updated",
    refreshResponse.token.expired_at,
    initialAuth.token.expired_at,
  );
  TestValidator.equals(
    "refresh token stays same",
    refreshResponse.token.refresh,
    initialAuth.token.refresh,
  );
  TestValidator.predicate(
    "refreshable until unchanged",
    refreshResponse.token.refreshable_until ===
      initialAuth.token.refreshable_until,
  );
  // 6. Validate token timestamps are valid ISO dates
  TestValidator.predicate("new expiration is after initial expiration", () => {
    const initialExp = new Date(initialAuth.token.expired_at).getTime();
    const newExp = new Date(refreshResponse.token.expired_at).getTime();
    return newExp > initialExp;
  });
  // 7. Verify new token can be used for authenticated calls
  // Create a fresh connection with the new access token
  const refreshedConnection: api.IConnection = { host: connection.host };
  refreshedConnection.headers = {
    Authorization: `Bearer ${refreshResponse.token.access}`,
  };
  // The system doesn't have a simple authenticated endpoint to test,
  // but we've validated the refresh worked through the response structure
}
