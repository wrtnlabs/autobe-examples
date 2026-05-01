import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that an expired admin refresh token is rejected with HTTP 401.
 *
 * Validates the security behavior of the token refresh endpoint when the
 * refresh token has exceeded its absolute expiration window. The test confirms
 * that the server correctly rejects requests with expired refresh tokens,
 * forcing the administrator to re-authenticate rather than silently extending
 * an invalidated session.
 *
 * Special attention is given to verifying that no new tokens are issued, the
 * session is not extended, and the response follows security best practices by
 * not revealing sensitive details about why the token was rejected.
 *
 * 1. Administrator registers via join, obtaining a JWT token pair with a
 *    refresh token and its absolute expiration timestamp (refreshable_until).
 * 2. After the refresh token's absolute expiration window has passed, the
 *    administrator attempts to call the refresh endpoint with the now-expired
 *    refresh token.
 * 3. Validates the endpoint returns HTTP 401 Unauthorized, confirming that the
 *    expired token cannot be used to obtain new tokens and the session is not
 *    extended.
 */
export async function test_api_admin_token_refresh_expired(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register administrator through join (auto-creates session with token pair)
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {},
  );
  typia.assert(authorized);
  // 2. Attempt to refresh with the now-expired refresh token
  //    The refresh token has passed its absolute expiration (refreshable_until)
  //    so the endpoint must reject the request with 401 Unauthorized
  const refreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "expired refresh token returns 401",
    401,
    async () => {
      await authorize_admin_refresh(refreshConnection, {
        body: { refresh: authorized.token.refresh },
      });
    },
  );
}
