import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that the token refresh operation properly invalidates old tokens to prevent token reuse attacks.
 *
 * **Success Scenario**:
 * 1. Create a new member account via /redditClone/auth/member/join
 * 2. Capture the initial access_token and refresh_token from the join response
 * 3. Call POST /redditClone/auth/member/refresh with the initial refresh_token
 * 4. Capture the new access_token and refresh_token from the refresh response
 * 5. Attempt to call POST /redditClone/auth/member/refresh again with the OLD (initial) refresh_token
 * 6. Verify the second refresh attempt is rejected (old token has been invalidated)
 * 7. Verify that using the NEW refresh_token from step 4 succeeds and returns fresh tokens
 *
 * **Business Validation Points**:
 * - Old refresh tokens are invalidated after a successful refresh operation
 * - Only the most recently issued refresh token remains valid
 * - This prevents token reuse attacks and maintains session security
 * - The member identity remains consistent across all refresh operations
 * - Each successful refresh generates completely new token pairs
 *
 * **Security Behavior**:
 * - Token rotation ensures that compromised old tokens cannot be used
 * - Session continuity is maintained through the new refresh token
 * - The refreshable_until deadline may extend with each successful refresh (depending on configuration)
 */
export async function test_api_member_session_token_refresh_invalidates_old_tokens(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and obtain initial tokens
  const joinResult = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(joinResult);
  // Capture initial tokens
  const initialRefreshToken = joinResult.token.refresh;
  const initialAccessToken = joinResult.token.access;
  const memberId = joinResult.id;
  // 2. First refresh - use initial refresh token to get new tokens
  const firstRefreshConnection: api.IConnection = { host: connection.host };
  const firstRefreshResult = await authorize_member_refresh(
    firstRefreshConnection,
    {
      body: {
        refresh_token: initialRefreshToken,
      } satisfies IRedditCloneMember.IRefresh,
    },
  );
  typia.assert(firstRefreshResult);
  // Capture new tokens from first refresh
  const newRefreshToken = firstRefreshResult.token.refresh;
  const newAccessToken = firstRefreshResult.token.access;
  // Verify member identity is consistent
  TestValidator.equals(
    "member id consistent after refresh",
    firstRefreshResult.id,
    memberId,
  );
  // Verify tokens are different (new tokens issued)
  TestValidator.notEquals(
    "access token changed",
    initialAccessToken,
    newAccessToken,
  );
  TestValidator.notEquals(
    "refresh token changed",
    initialRefreshToken,
    newRefreshToken,
  );
  // 3. Attempt to use OLD refresh token again - should fail
  const oldTokenConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("old refresh token rejected", async () => {
    await authorize_member_refresh(oldTokenConnection, {
      body: {
        refresh_token: initialRefreshToken,
      } satisfies IRedditCloneMember.IRefresh,
    });
  });
  // 4. Verify NEW refresh token still works
  const newTokenConnection: api.IConnection = { host: connection.host };
  const secondRefreshResult = await authorize_member_refresh(
    newTokenConnection,
    {
      body: {
        refresh_token: newRefreshToken,
      } satisfies IRedditCloneMember.IRefresh,
    },
  );
  typia.assert(secondRefreshResult);
  // Verify member identity remains consistent
  TestValidator.equals(
    "member id consistent across all refreshes",
    secondRefreshResult.id,
    memberId,
  );
  // Verify new tokens were issued again
  TestValidator.notEquals(
    "access token changed again",
    newAccessToken,
    secondRefreshResult.token.access,
  );
  TestValidator.notEquals(
    "refresh token changed again",
    newRefreshToken,
    secondRefreshResult.token.refresh,
  );
}
