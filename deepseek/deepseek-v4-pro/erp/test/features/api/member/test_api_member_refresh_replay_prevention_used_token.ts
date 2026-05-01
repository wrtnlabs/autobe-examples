import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that a refresh token can only be used once — token replay is prevented.
 *
 * Validates the single-use nature of refresh tokens in the ERP HRM authentication system. After a refresh token has been successfully exchanged for a new token pair, the original refresh token is immediately invalidated and cannot be reused. This prevents token replay attacks where an attacker might attempt to reuse a captured refresh token.
 *
 * 1. A new member joins via authorize_member_join to obtain an initial JWT access and refresh token pair.
 * 2. The refresh endpoint is called once with the original refresh token, successfully rotating the token pair.
 * 3. The same original refresh token is replayed in a second refresh call.
 * 4. The second attempt is rejected with 401 Unauthorized, confirming the original refresh token was invalidated during the first rotation.
 */
export async function test_api_member_refresh_replay_prevention_used_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a new member to obtain the initial token pair
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // Save the original refresh token from the join response
  const originalRefreshToken = authorized.token.refresh;
  // 2. First refresh with the original token — should succeed and rotate tokens
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_member_refresh(refreshConnection, {
    body: {
      refresh_token: originalRefreshToken,
    } satisfies IErpHrmMember.IRefresh,
  });
  typia.assert(refreshed);
  // 3. Second refresh with the SAME original token — should fail with 401
  // The original refresh token was invalidated during the first rotation
  await TestValidator.httpError(
    "replay of used refresh token returns 401",
    401,
    async () => {
      await authorize_member_refresh(
        { host: connection.host },
        {
          body: {
            refresh_token: originalRefreshToken,
          } satisfies IErpHrmMember.IRefresh,
        },
      );
    },
  );
}
