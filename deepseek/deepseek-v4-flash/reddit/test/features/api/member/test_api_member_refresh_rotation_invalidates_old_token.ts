import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
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
 * Test that token rotation invalidates the old refresh token after a successful refresh, preventing replay attacks.
 *
 * Validates the security property that each refresh operation creates a new session and deletes the old one. An attacker who intercepts a previously valid but now-stale refresh token must not be able to use it to obtain new access tokens.
 *
 * 1. Register a new member account via `authorize_member_join`, capturing the initial refresh token (token_A).
 * 2. Perform a first refresh using token_A — the server rotates the session: token_A becomes stale, and a new token_B is issued.
 * 3. Attempt to reuse token_A — this must fail with HTTP 404 because token_A's SHA-256 hash no longer matches any active session record.
 * 4. Perform a second refresh using token_B — this must succeed, confirming token_B was properly preserved as the active session. A new token_C is issued, and token_B becomes stale.
 */
export async function test_api_member_refresh_rotation_invalidates_old_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member and capture token_A
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {});
  typia.assert(joinResult);
  const tokenA: string = joinResult.token.refresh;
  // 2. First refresh with token_A → session rotates, token_B issued
  const refreshConnection1: api.IConnection = { host: connection.host };
  const refreshResult1: ICommunityPlatformMember.IAuthorized =
    await authorize_member_refresh(refreshConnection1, {
      body: { refresh: tokenA } satisfies ICommunityPlatformMember.IRefresh,
    });
  typia.assert(refreshResult1);
  const tokenB: string = refreshResult1.token.refresh;
  // 3. Attempt to reuse stale token_A — must fail with 404
  const staleConnection1: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "reuse stale token_A after rotation",
    404,
    async () => {
      await authorize_member_refresh(staleConnection1, {
        body: { refresh: tokenA } satisfies ICommunityPlatformMember.IRefresh,
      });
    },
  );
  // 4. Refresh with token_B — must succeed (new session still active), token_C issued
  const refreshConnection2: api.IConnection = { host: connection.host };
  const refreshResult2: ICommunityPlatformMember.IAuthorized =
    await authorize_member_refresh(refreshConnection2, {
      body: { refresh: tokenB } satisfies ICommunityPlatformMember.IRefresh,
    });
  typia.assert(refreshResult2);
  const tokenC: string = refreshResult2.token.refresh;
  // 5. Now token_B is also stale — attempt to reuse it must fail with 404
  const staleConnection2: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "reuse stale token_B after second rotation",
    404,
    async () => {
      await authorize_member_refresh(staleConnection2, {
        body: { refresh: tokenB } satisfies ICommunityPlatformMember.IRefresh,
      });
    },
  );
}
