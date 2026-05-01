import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test refresh token rotation prevents reuse of old tokens.
 *
 * Validates that the refresh token rotation mechanism properly invalidates old refresh tokens after each successful refresh operation. After a member joins and performs a token refresh, the original refresh token from the join operation must be revoked — subsequent refresh attempts using the original token must be rejected with 401 Unauthorized.
 *
 * 1. Member joins and obtains initial access and refresh tokens.
 * 2. Member performs a successful refresh using the original refresh token.
 * 3. Member attempts to refresh again using the same original refresh token.
 * 4. System rejects with 401 Unauthorized, confirming token rotation.
 */
export async function test_api_member_refresh_token_rotation_prevents_reuse(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection, {});
  typia.assert(joinResult);
  const originalRefreshToken = joinResult.token.refresh;
  // 2. Successful refresh with original token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await authorize_member_refresh(refreshConnection, {
    body: {
      refreshToken: originalRefreshToken,
    } satisfies ITodoAppMember.IRefresh,
  });
  typia.assert(refreshResult);
  // 3-4. Attempt refresh with original (now revoked) token — must fail with 401
  await TestValidator.httpError(
    "original refresh token rejected after rotation",
    401,
    async () => {
      await authorize_member_refresh(
        { host: connection.host },
        {
          body: {
            refreshToken: originalRefreshToken,
          } satisfies ITodoAppMember.IRefresh,
        },
      );
    },
  );
}
