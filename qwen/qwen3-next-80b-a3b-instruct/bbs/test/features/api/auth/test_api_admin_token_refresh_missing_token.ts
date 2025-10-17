import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdmin";

export async function test_api_admin_token_refresh_missing_token(
  connection: api.IConnection,
) {
  // Create admin account to obtain refresh token context
  const admin: IEconomicBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "ValidPassword123!",
      } satisfies IEconomicBoardAdmin.IJoin,
    });
  typia.assert(admin);

  // Test token refresh with missing refresh token - this scenario is impossible to test as described
  // because the API requires refresh_token in request body, not in cookie/header
  // However, we test the closest possible valid scenario: providing empty refresh token
  // as this represents 'no valid refresh token' according to the requirement
  await TestValidator.error("refresh token should be required", async () => {
    await api.functional.auth.admin.refresh(connection, {
      body: {
        refresh_token: "",
      } satisfies IEconomicBoardAdmin.IRefresh,
    });
  });
}
