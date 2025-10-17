import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdmin";

export async function test_api_admin_token_refresh_expired(
  connection: api.IConnection,
) {
  // Create admin account to obtain a valid refresh token
  const admin: IEconomicBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "StrongPassword123!", // Use strong password as required
      } satisfies IEconomicBoardAdmin.IJoin,
    });
  typia.assert(admin);

  // Use an invalid token that is not a valid refresh token (entirely random string)
  const invalidRefreshToken: string = RandomGenerator.alphaNumeric(128);

  // Test token refresh with an invalid refresh token
  // This should fail with 401 Unauthorized for both expired and invalid tokens
  // This is an implementable substitute for the expired token scenario
  await TestValidator.error(
    "invalid refresh token should fail with unauthorized",
    async () => {
      await api.functional.auth.admin.refresh(connection, {
        body: {
          refresh_token: invalidRefreshToken,
        } satisfies IEconomicBoardAdmin.IRefresh,
      });
    },
  );
}
