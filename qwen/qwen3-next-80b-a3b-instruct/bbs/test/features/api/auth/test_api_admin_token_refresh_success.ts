import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdmin";

export async function test_api_admin_token_refresh_success(
  connection: api.IConnection,
) {
  // Step 1: Create admin account to obtain refresh token
  const admin: IEconomicBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(16), // 16-character password
      } satisfies IEconomicBoardAdmin.IJoin,
    });
  typia.assert(admin);

  // Step 2: Use the refresh token obtained from the previous login to refresh the access token
  const refreshed: IEconomicBoardAdmin.IAuthorized =
    await api.functional.auth.admin.refresh(connection, {
      body: {
        refresh_token: admin.token.refresh,
      } satisfies IEconomicBoardAdmin.IRefresh,
    });
  typia.assert(refreshed);

  // Step 3: Validation: Ensure the refreshed token has a new auth_jwt_id (token rotation)
  TestValidator.notEquals(
    "auth_jwt_id should be different after refresh",
    admin.auth_jwt_id,
    refreshed.auth_jwt_id,
  );

  // Step 4: Validation: Ensure last_login timestamp has been updated
  TestValidator.notEquals(
    "last_login should be updated after refresh",
    admin.last_login,
    refreshed.last_login,
  );

  // Step 5: Validation: Ensure access token is new and has the correct expiration format
  TestValidator.notEquals(
    "access token should be different after refresh",
    admin.token.access,
    refreshed.token.access,
  );

  // Step 6: Validation: Ensure refresh token has been rotated (obtained value should be different from original)
  TestValidator.notEquals(
    "refresh token should be rotated after refresh",
    admin.token.refresh,
    refreshed.token.refresh,
  );

  // Step 7: Validation: Ensure the new token has expiration times in correct ISO 8601 format
  typia.assert<string & tags.Format<"date-time">>(refreshed.token.expired_at);
  typia.assert<string & tags.Format<"date-time">>(
    refreshed.token.refreshable_until,
  );
}
