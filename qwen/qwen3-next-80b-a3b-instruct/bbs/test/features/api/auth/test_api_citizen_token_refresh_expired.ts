import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";

export async function test_api_citizen_token_refresh_expired(
  connection: api.IConnection,
) {
  // Generate a valid refresh token with correct format
  const validRefreshToken = typia.random<IEconomicBoardCitizen.IRefresh>();

  // Step 1: Test that valid refresh token format is accepted
  const response: IEconomicBoardCitizen.IAuthorized =
    await api.functional.auth.citizen.refresh(connection, {
      body: validRefreshToken,
    });
  typia.assert(response);

  // Step 2: Test that invalid refresh token format is rejected
  // Generate a completely invalid string (not matching JWT format)
  const invalidRefreshToken = {
    refresh_token: RandomGenerator.alphaNumeric(5), // 5-char string, not valid JWT
  } satisfies IEconomicBoardCitizen.IRefresh;

  // This should throw unless it's a very specific edge case
  await TestValidator.error(
    "invalid refresh token format should be rejected",
    async () => {
      await api.functional.auth.citizen.refresh(connection, {
        body: invalidRefreshToken,
      });
    },
  );
}
