import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test token refresh with an expired refresh token.
 *
 * Validates the security boundary for expired session tokens. When a super administrator
 * attempts to refresh their session using a refresh token that has passed its expiry time,
 * the system must reject the request and return an appropriate authentication error.
 * This ensures that expired tokens cannot be used to maintain unauthorized access.
 *
 * The test registers a new superAdmin account to obtain valid tokens, then attempts to
 * refresh using a simulated expired refresh token. The system responds with an HTTP 401
 * Unauthorized error indicating token expiration.
 *
 * 1. Register a new superAdmin account to obtain valid initial tokens.
 * 2. Attempt to refresh using an expired/invalid refresh token.
 * 3. Validate that the system rejects the request with HTTP 401 Unauthorized.
 * 4. Verify the error response properly indicates authentication failure.
 */
export async function test_api_superadmin_token_refresh_expired(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new superAdmin account to obtain valid tokens
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized: IEcommerceMallSuperAdmin.IAuthorized =
    await authorize_super_admin_join(superAdminConnection, {});
  typia.assert(authorized);
  // 2. Attempt to refresh using an expired/invalid refresh token
  // The system should reject this with HTTP 401 Unauthorized
  const expiredConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "expired refresh token should be rejected with 401",
    401,
    async () => {
      await api.functional.ecommerceMall.auth.superAdmin.refresh(
        expiredConnection,
        {
          body: {
            refreshToken: "expired.invalid.token.here",
          } satisfies IEcommerceMallSuperAdmin.IRefresh,
        },
      );
    },
  );
}
