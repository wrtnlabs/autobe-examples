import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest session refresh with token rotation validation.
 * 1. Create guest account via join endpoint to establish initial session
 * 2. Call refresh endpoint with original refresh token
 * 3. Verify new refresh token is different from original (token rotation)
 * 4. Attempt to use old refresh token - should fail as invalid
 * 5. Use new refresh token for another refresh - should succeed
 */
export async function test_api_guest_session_refresh_token_rotation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create initial guest account to obtain refresh token
  const guestJoinResult: IRedditCommunityGuest.IAuthorized =
    await authorize_guest_join(connection, {
      body: {
        deviceFingerprint: RandomGenerator.alphaNumeric(32),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditCommunityGuest.IJoin,
    });
  typia.assert(guestJoinResult);
  // Store the original refresh token for validation
  const originalRefreshToken: string = guestJoinResult.token.refresh;
  // 2. Create new connection and refresh with original token
  const refreshConnection: api.IConnection = { host: connection.host };
  const firstRefreshResult: IRedditCommunityGuest.IAuthorized =
    await authorize_guest_refresh(refreshConnection, {
      body: {
        refresh_token: originalRefreshToken,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditCommunityGuest.IRefresh,
    });
  typia.assert(firstRefreshResult);
  // 3. Verify token rotation - new refresh token should be different
  const newRefreshToken: string = firstRefreshResult.token.refresh;
  TestValidator.notEquals(
    "refresh token should rotate (new token different from original)",
    originalRefreshToken,
    newRefreshToken,
  );
  // 4. Attempt to use old refresh token - should fail as it's invalidated
  const oldTokenConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "old refresh token should be rejected after rotation",
    async () => {
      await authorize_guest_refresh(oldTokenConnection, {
        body: {
          refresh_token: originalRefreshToken,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IRedditCommunityGuest.IRefresh,
      });
    },
  );
  // 5. Use new refresh token for another refresh - should succeed
  const secondRefreshConnection: api.IConnection = { host: connection.host };
  const secondRefreshResult: IRedditCommunityGuest.IAuthorized =
    await authorize_guest_refresh(secondRefreshConnection, {
      body: {
        refresh_token: newRefreshToken,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditCommunityGuest.IRefresh,
    });
  typia.assert(secondRefreshResult);
  // Verify second refresh also produces a new token
  TestValidator.notEquals(
    "second refresh should also rotate token",
    newRefreshToken,
    secondRefreshResult.token.refresh,
  );
}
