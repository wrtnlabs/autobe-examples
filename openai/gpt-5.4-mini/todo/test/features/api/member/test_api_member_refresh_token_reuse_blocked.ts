import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppProfile";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test refresh-token replay prevention after a successful renewal.
 *
 * Verifies the member token refresh flow prevents reuse of an old refresh token
 * after one successful renewal. The test creates an isolated member session,
 * captures the original refresh token, performs a valid refresh, and then
 * attempts to submit the same original refresh token again to confirm the
 * server blocks token replay and session reuse.
 *
 * 1. Register a new member and capture the issued authorization bundle.
 * 2. Refresh the session once using the captured refresh token.
 * 3. Reuse the original refresh token and expect the request to fail.
 */
export async function test_api_member_refresh_token_reuse_blocked(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(authorized);
  const originalRefreshToken = authorized.token.refresh;
  const originalAccessToken = authorized.token.access;
  const refreshedConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_member_refresh(refreshedConnection, {
    body: {
      refreshToken: originalRefreshToken,
    } satisfies ITodoAppMember.IRefresh,
  });
  typia.assert(refreshed);
  TestValidator.equals(
    "member id should remain the same after refresh",
    refreshed.id,
    authorized.id,
  );
  TestValidator.equals(
    "email should remain the same after refresh",
    refreshed.email,
    authorized.email,
  );
  TestValidator.notEquals(
    "access token should rotate after refresh",
    refreshed.token.access,
    originalAccessToken,
  );
  TestValidator.notEquals(
    "refresh token should rotate after refresh",
    refreshed.token.refresh,
    originalRefreshToken,
  );
  const reuseConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "reusing the original refresh token should be rejected",
    [400, 401, 403],
    async () => {
      await authorize_member_refresh(reuseConnection, {
        body: {
          refreshToken: originalRefreshToken,
        } satisfies ITodoAppMember.IRefresh,
      });
    },
  );
}
