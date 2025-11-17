import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";

export async function test_api_citizen_token_refresh_after_login(
  connection: api.IConnection,
) {
  const citizenEmail = typia.random<string & tags.Format<"email">>();
  const citizenPassword = "testpassword123";

  // Step 1: Login to obtain refresh token
  const loginResponse: IEconomicBoardCitizen.IAuthorized =
    await api.functional.auth.citizen.login(connection, {
      body: {
        email: citizenEmail,
        password: citizenPassword,
      } satisfies IEconomicBoardCitizen.ILogin,
    });
  typia.assert(loginResponse);

  // Store original tokens for rotation validation
  const originalAccessToken = loginResponse.token.access;
  const originalRefreshToken = loginResponse.token.refresh;

  // Step 2: Use refresh token to obtain new access token
  const refreshResponse: IEconomicBoardCitizen.IAuthorized =
    await api.functional.auth.citizen.refresh(connection, {
      body: {
        refresh_token: originalRefreshToken,
      } satisfies IEconomicBoardCitizen.IRefresh,
    });
  typia.assert(refreshResponse);

  // Validate that citizen id remained the same after refresh
  TestValidator.equals(
    "citizen id unchanged after refresh",
    loginResponse.id,
    refreshResponse.id,
  );

  // Validate that refresh token was rotated (new refresh token !== old refresh token)
  TestValidator.notEquals(
    "refresh token was rotated",
    originalRefreshToken,
    refreshResponse.token.refresh,
  );

  // Validate that access token was rotated (new access token !== original access token)
  TestValidator.notEquals(
    "access token was rotated",
    originalAccessToken,
    refreshResponse.token.access,
  );
}
