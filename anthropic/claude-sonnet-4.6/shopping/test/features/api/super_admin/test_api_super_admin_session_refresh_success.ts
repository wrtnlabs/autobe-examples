import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_session_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create actor-specific connection for super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  // 2. Register a new super admin and obtain initial authorized session
  const joinResult = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(joinResult);
  // 3. Store initial token values and account info for later comparison
  const initialAccessToken = joinResult.token.access;
  const initialRefreshToken = joinResult.token.refresh;
  const originalId = joinResult.id;
  const originalEmail = joinResult.email;
  // 4. Call refresh using the refresh token from join step
  const refreshResult = await authorize_super_admin_refresh(
    superAdminConnection,
    {
      body: {
        refresh: initialRefreshToken,
      } satisfies IShoppingMallSuperAdmin.IRefresh,
    },
  );
  typia.assert(refreshResult);
  // 5. Verify new access token is different from the original
  TestValidator.notEquals(
    "new access token must differ from original",
    refreshResult.token.access,
    initialAccessToken,
  );
  // 6. Verify new refresh token is different from the original
  TestValidator.notEquals(
    "new refresh token must differ from original",
    refreshResult.token.refresh,
    initialRefreshToken,
  );
  // 7. Verify super admin id matches the original account
  TestValidator.equals(
    "super admin id must match after refresh",
    refreshResult.id,
    originalId,
  );
  // 8. Verify super admin email matches the original account
  TestValidator.equals(
    "super admin email must match after refresh",
    refreshResult.email,
    originalEmail,
  );
  // 9. Verify deleted_at is null (account is still active)
  TestValidator.equals(
    "deleted_at must be null (account is active)",
    refreshResult.deleted_at,
    null,
  );
  // 10. Verify new expired_at is in the future
  TestValidator.predicate(
    "new expired_at must be in the future",
    new Date(refreshResult.token.expired_at).getTime() > Date.now(),
  );
}
