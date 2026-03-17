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

export async function test_api_super_admin_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account and obtain initial authentication tokens
  const joinResult: IShoppingMallSuperAdmin.IAuthorized =
    await authorize_super_admin_join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSuperAdmin.IJoin,
    });
  typia.assert(joinResult);
  // 2. Store original tokens for comparison
  const originalAccessToken: string = joinResult.token.access;
  const originalRefreshToken: string = joinResult.token.refresh;
  const originalExpiredAt: string = joinResult.token.expired_at;
  const originalRefreshableUntil: string = joinResult.token.refreshable_until;
  // 3. Call refresh endpoint with the refresh token from join response
  const refreshResult: IShoppingMallSuperAdmin.IAuthorized =
    await authorize_super_admin_refresh(connection, {
      body: {
        refresh_token: originalRefreshToken,
      } satisfies IShoppingMallSuperAdmin.IRefresh,
    });
  typia.assert(refreshResult);
  // 4. Validate account information is preserved
  TestValidator.equals(
    "super admin id preserved",
    refreshResult.id,
    joinResult.id,
  );
  TestValidator.equals(
    "super admin email preserved",
    refreshResult.email,
    joinResult.email,
  );
  // 5. Validate new access token is different from original
  TestValidator.notEquals(
    "access token rotated",
    refreshResult.token.access,
    originalAccessToken,
  );
  // 6. Validate new refresh token is different from original (token rotation)
  TestValidator.notEquals(
    "refresh token rotated",
    refreshResult.token.refresh,
    originalRefreshToken,
  );
  // 7. Validate expired_at timestamp is in the future
  const expiredAtDate: Date = new Date(refreshResult.token.expired_at);
  const now: Date = new Date();
  TestValidator.predicate(
    "expired_at is in the future",
    expiredAtDate.getTime() > now.getTime(),
  );
  // 8. Validate refreshable_until timestamp is in the future
  const refreshableUntilDate: Date = new Date(
    refreshResult.token.refreshable_until,
  );
  TestValidator.predicate(
    "refreshable_until is in the future",
    refreshableUntilDate.getTime() > now.getTime(),
  );
  // 9. Validate refreshable_until is after or equal to expired_at
  TestValidator.predicate(
    "refreshable_until >= expired_at",
    refreshableUntilDate.getTime() >= expiredAtDate.getTime(),
  );
}
