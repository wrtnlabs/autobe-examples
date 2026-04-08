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

export async function test_api_super_admin_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new connection for super admin registration
  const superAdminConnection: api.IConnection = { host: connection.host };
  // 2. Register a new super admin to obtain initial tokens
  const initialAuth = await authorize_super_admin_join(
    superAdminConnection,
    {},
  );
  typia.assert(initialAuth);
  // Store initial token values for comparison
  const initialAccessToken = initialAuth.token.access;
  const initialRefreshToken = initialAuth.token.refresh;
  const initialExpiredAt = initialAuth.token.expired_at;
  // 3. Extract refresh token and call refresh endpoint
  const refreshedAuth = await authorize_super_admin_refresh(
    { host: connection.host },
    {
      body: {
        refreshToken: initialRefreshToken,
      } satisfies IEcommerceMallSuperAdmin.IRefresh,
    },
  );
  typia.assert(refreshedAuth);
  // 4. Validate super admin identity remains the same
  TestValidator.equals("id matches", refreshedAuth.id, initialAuth.id);
  TestValidator.equals("email matches", refreshedAuth.email, initialAuth.email);
  TestValidator.equals("grade matches", refreshedAuth.grade, initialAuth.grade);
  TestValidator.equals(
    "createdAt matches",
    refreshedAuth.createdAt,
    initialAuth.createdAt,
  );
  // 5. Validate new tokens are different from initial tokens
  TestValidator.notEquals(
    "access token is different",
    refreshedAuth.token.access,
    initialAccessToken,
  );
  TestValidator.notEquals(
    "refresh token is different",
    refreshedAuth.token.refresh,
    initialRefreshToken,
  );
  // 6. Validate expired_at timestamp is updated (new token should have later expiration)
  TestValidator.predicate(
    "expired_at is updated to a new timestamp",
    new Date(refreshedAuth.token.expired_at).getTime() >
      new Date(initialExpiredAt).getTime() ||
      refreshedAuth.token.expired_at !== initialExpiredAt,
  );
}
