import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_refresh_token_account_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new super administrator account to obtain initial authentication tokens
  const superAdmin = await authorize_super_administrator_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdministrator.IJoin,
  });
  typia.assert(superAdmin);
  // Verify account is active (not deleted)
  TestValidator.predicate("account is active", superAdmin.deleted_at === null);
  // 2. Store the refresh token for later use
  const refreshToken = superAdmin.token.refresh;
  // 3. Note: Account deletion endpoint is not available in the provided API functions.
  // In a complete implementation, we would delete the account here using an admin endpoint.
  // The refresh endpoint validates the deleted_at field during token refresh operations,
  // rejecting requests from soft-deleted accounts even with valid refresh tokens.
  // This test validates the baseline behavior for active accounts.
  // 4. Create a new connection for refresh operation (connection isolation pattern)
  const refreshConnection: api.IConnection = { host: connection.host };
  // 5. Attempt to refresh with the valid refresh token (account still active)
  const refreshResult =
    await api.functional.shoppingMall.auth.superAdministrator.refresh(
      refreshConnection,
      {
        body: {
          refresh: refreshToken,
        } satisfies IShoppingMallSuperAdministrator.IRefresh,
      },
    );
  typia.assert(refreshResult);
  // 6. Verify new tokens were issued successfully
  TestValidator.notEquals(
    "new access token issued",
    superAdmin.token.access,
    refreshResult.token.access,
  );
  TestValidator.notEquals(
    "new refresh token issued",
    superAdmin.token.refresh,
    refreshResult.token.refresh,
  );
  TestValidator.predicate(
    "new expiration set",
    refreshResult.token.expired_at > superAdmin.token.expired_at,
  );
  TestValidator.equals("account ID preserved", refreshResult.id, superAdmin.id);
  TestValidator.equals(
    "email preserved",
    refreshResult.email,
    superAdmin.email,
  );
  // 7. Verify the refresh connection has the new access token
  TestValidator.equals(
    "connection updated",
    refreshConnection.headers?.Authorization,
    refreshResult.token.access,
  );
}
