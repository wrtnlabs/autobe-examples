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

export async function test_api_superadmin_token_refresh_with_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register super admin to get valid tokens
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_join(superAdminConnection, {});
  // 2. Construct an expired refresh token
  // Create a JWT-like expired token with past refreshable_until timestamp
  const expiredRefreshToken = await constructExpiredRefreshToken(
    authorized.token.refresh,
  );
  // 3. Attempt to refresh using expired token
  // 4. Validate 401 Unauthorized with error message about expired token
  await TestValidator.httpError(
    "expired refresh token returns 401",
    401,
    async () => {
      await api.functional.ecommerceMall.auth.superAdmin.refresh(
        superAdminConnection,
        {
          body: {
            refreshToken: expiredRefreshToken,
          } satisfies IEcommerceMallSuperAdmin.IRefresh,
        },
      );
    },
  );
}
/**
 * Constructs a JWT token with an expired refreshable_until timestamp.
 * Creates a fake but structurally valid JWT to test expired token rejection.
 */
async function constructExpiredRefreshToken(
  validRefreshToken: string,
): Promise<string> {
  // JWT structure: header.payload.signature
  const parts = validRefreshToken.split(".");
  if (parts.length === 3) {
    // Decode payload and modify expiration
    const payload = JSON.parse(atob(parts[1]));
    // Set refreshable_until to a past date (1 day ago)
    const expiredDate = new Date();
    expiredDate.setDate(expiredDate.getDate() - 1);
    payload.refreshable_until = expiredDate.toISOString();
    // Re-encode with modified payload
    parts[1] = btoa(JSON.stringify(payload));
    return parts.join(".");
  }
  // Fallback: return a fake expired token
  const expiredDate = new Date();
  expiredDate.setDate(expiredDate.getDate() - 1);
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(
    JSON.stringify({
      sub: "test",
      refreshable_until: expiredDate.toISOString(),
      iat: Math.floor(expiredDate.getTime() / 1000) - 86400,
      exp: Math.floor(expiredDate.getTime() / 1000),
    }),
  );
  const signature = btoa("fake-signature");
  return `${header}.${payload}.${signature}`;
}
