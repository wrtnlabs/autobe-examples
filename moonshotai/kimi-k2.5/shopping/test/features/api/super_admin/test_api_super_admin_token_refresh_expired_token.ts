import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_token_refresh_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // Create isolated super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Join as super admin to obtain initial valid refresh token
  const initialAuth = await api.functional.ecommerceMall.auth.superAdmin.join(
    superAdminConnection,
    {
      body: typia.random<IEcommerceMallSuperAdmin.IJoin>(),
    },
  );
  typia.assert(initialAuth);
  // Consume the refresh token by performing a successful refresh (token rotation invalidates old token)
  const refreshedAuth = await authorize_super_admin_refresh(
    superAdminConnection,
    {
      body: {
        refreshToken: initialAuth.token.refresh,
      } satisfies IEcommerceMallSuperAdmin.IRefresh,
    },
  );
  typia.assert(refreshedAuth);
  // Attempt to reuse the old refresh token - should fail with authentication error
  await TestValidator.error(
    "reused refresh token should be rejected",
    async () => {
      await authorize_super_admin_refresh(superAdminConnection, {
        body: {
          refreshToken: initialAuth.token.refresh,
        } satisfies IEcommerceMallSuperAdmin.IRefresh,
      });
    },
  );
}
