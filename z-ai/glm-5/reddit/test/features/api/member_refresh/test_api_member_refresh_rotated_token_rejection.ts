import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
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
 * Test security feature: reused rotated refresh token is rejected.
 *
 * This validates the token rotation security mechanism. When a refresh token
 * is used, it should be invalidated and a new token issued. Any subsequent
 * attempt to use the old token should be rejected as a potential security threat.
 *
 * Test steps:
 * 1. Member joins to get initial refresh token (Token A)
 * 2. Token A is used to refresh, receiving new tokens (Token B)
 *    - Token A is now invalidated by the rotation
 * 3. Attempt to use Token A again for refresh
 * 4. Validate that the request is rejected with authentication error
 *
 * Business rules validated:
 * - Token rotation invalidates previous refresh token
 * - Reusing an old rotated token is treated as potential security breach
 * - Error response indicates need for re-authentication
 * - Demonstrates protection against refresh token theft
 */
export async function test_api_member_refresh_rotated_token_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins to get initial tokens (Token A)
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection, {});
  typia.assert(joinResult);
  // Store the initial refresh token (Token A) - will be invalidated after rotation
  const oldRefreshToken = joinResult.token.refresh;
  // 2. Use Token A to refresh and get new tokens (Token B)
  // This rotation should invalidate Token A
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await authorize_member_refresh(refreshConnection, {
    body: {
      refreshToken: oldRefreshToken,
    } satisfies ICommunityPlatformMember.IRefresh,
  });
  typia.assert(refreshResult);
  // Token A is now invalidated - new token pair (Token B) has been issued
  const newRefreshToken = refreshResult.token.refresh;
  // Verify that new refresh token is different (rotation occurred)
  TestValidator.notEquals(
    "Refresh token should be rotated to a new value",
    oldRefreshToken,
    newRefreshToken,
  );
  // 3. Attempt to use the old rotated token (Token A) again
  // This should be rejected as a potential security threat
  await TestValidator.error(
    "Reusing rotated refresh token should be rejected",
    async () => {
      const oldTokenConnection: api.IConnection = { host: connection.host };
      await api.functional.communityPlatform.auth.member.refresh(
        oldTokenConnection,
        {
          body: {
            refreshToken: oldRefreshToken,
          } satisfies ICommunityPlatformMember.IRefresh,
        },
      );
    },
  );
}
