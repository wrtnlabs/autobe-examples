import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdmin";

export async function test_api_admin_token_refresh_invalid_token(
  connection: api.IConnection,
) {
  // Step 1: Create admin account to obtain valid credentials
  const admin: IEconomicBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePass123!",
      } satisfies IEconomicBoardAdmin.IJoin,
    });
  typia.assert(admin);

  // Step 2: Create an invalid refresh token (malformed, not from valid login)
  const invalidRefreshToken = "invalid-refresh-token-malformed";

  // Step 3: Attempt refresh with invalid token - must fail with 401 Unauthorized
  await TestValidator.httpError(
    "invalid refresh token should return 401 Unauthorized",
    401,
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: {
          refresh_token: invalidRefreshToken,
        } satisfies IEconomicBoardAdmin.IRefresh,
      });
    },
  );
}
