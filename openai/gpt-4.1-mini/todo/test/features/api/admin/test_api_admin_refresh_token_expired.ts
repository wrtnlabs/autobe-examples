import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

export async function test_api_admin_refresh_token_expired(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate admin user to get valid tokens
  const email = `admin_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const password = "SecurePass123!";
  const joinBody = { email, password } satisfies ITodoListAdmin.ICreate;
  const authorized: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinBody });
  typia.assert(authorized);

  // Capture the valid refresh token
  const validRefreshToken = authorized.token.refresh;

  // Step 2: Modify the refresh token to simulate expiry or invalid token
  const tamperedRefreshToken = validRefreshToken + "_tampered";

  // Step 3: Attempt to refresh token with the tampered refresh token - expecting error
  await TestValidator.error(
    "Refresh token should be rejected if expired or invalid",
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: {
          refresh_token: tamperedRefreshToken,
        } satisfies ITodoListAdmin.IRefresh,
      });
    },
  );
}
