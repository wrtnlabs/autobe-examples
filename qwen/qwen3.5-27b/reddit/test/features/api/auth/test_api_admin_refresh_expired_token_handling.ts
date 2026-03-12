import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that token refresh properly handles expired refresh tokens.
 * 1. Create admin account via join endpoint to obtain initial tokens
 * 2. Extract the refresh token and refreshable_until timestamp from the response
 * 3. Attempt to call the refresh endpoint with the refresh token
 * 4. Verify the system returns appropriate response (401 for expired tokens)
 * 5. Confirm the error handling indicates re-authentication is required
 */
export async function test_api_admin_refresh_expired_token_handling(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and obtain initial authentication tokens
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {},
  });
  typia.assert(admin);
  // 2. Extract refresh token from the response
  const refreshToken: string = admin.token.refresh;
  const refreshableUntil: string = admin.token.refreshable_until;
  // 3. Test refresh with valid token (should succeed immediately after creation)
  const refreshedAdmin = await authorize_admin_refresh(adminConnection, {
    body: {
      refresh: refreshToken,
    } satisfies IRedditCloneAdmin.IRefresh,
  });
  typia.assert(refreshedAdmin);
  // 4. Verify refresh response contains new tokens
  TestValidator.equals(
    "refreshed admin id matches",
    refreshedAdmin.id,
    admin.id,
  );
  TestValidator.equals(
    "refreshed admin email matches",
    refreshedAdmin.email,
    admin.email,
  );
  TestValidator.predicate(
    "new access token provided",
    refreshedAdmin.token.access !== admin.token.access,
  );
  TestValidator.predicate(
    "new refresh token provided",
    refreshedAdmin.token.refresh !== admin.token.refresh,
  );
  // 5. Test error handling: attempt to use invalid refresh token
  await TestValidator.httpError(
    "invalid refresh token returns 401",
    401,
    async () => {
      await authorize_admin_refresh(adminConnection, {
        body: {
          refresh: "invalid_token_string",
        } satisfies IRedditCloneAdmin.IRefresh,
      });
    },
  );
  // 6. Test error handling: attempt to use empty refresh token
  await TestValidator.httpError(
    "empty refresh token returns 401",
    401,
    async () => {
      await authorize_admin_refresh(adminConnection, {
        body: {
          refresh: "",
        } satisfies IRedditCloneAdmin.IRefresh,
      });
    },
  );
}
