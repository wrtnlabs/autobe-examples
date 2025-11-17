import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";

export async function test_api_citizen_token_refresh_valid(
  connection: api.IConnection,
) {
  // Generate a valid refresh token using UUID format as specified in IEconomicBoardCitizen.IRefresh
  const refreshToken = typia.random<string & tags.Format<"uuid">>();

  // Call the refresh endpoint with a valid refresh token
  const refreshResponse: IEconomicBoardCitizen.IAuthorized =
    await api.functional.auth.citizen.refresh(connection, {
      body: {
        refresh_token: refreshToken,
      } satisfies IEconomicBoardCitizen.IRefresh,
    });
  typia.assert(refreshResponse);

  // Verify the response contains a non-empty access token
  TestValidator.predicate(
    "access token should be non-empty string",
    refreshResponse.token.access.length > 0,
  );

  // Verify the response contains a non-empty refresh token (rotated token)
  TestValidator.predicate(
    "refresh token should be non-empty string",
    refreshResponse.token.refresh.length > 0,
  );

  // Verify citizen ID is preserved
  TestValidator.equals(
    "citizen ID should be preserved",
    refreshToken,
    refreshResponse.token.refresh,
  );
}
