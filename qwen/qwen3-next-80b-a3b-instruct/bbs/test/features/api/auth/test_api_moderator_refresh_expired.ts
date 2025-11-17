import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardModerator";

export async function test_api_moderator_refresh_expired(
  connection: api.IConnection,
) {
  // Generate a valid refresh token first
  const validRefreshToken: IEconomicBoardModerator.IRefresh =
    typia.random<IEconomicBoardModerator.IRefresh>();

  // Use the valid refresh token to obtain an authorized response
  const initialResponse: IEconomicBoardModerator.IAuthorized =
    await api.functional.auth.moderator.refresh(connection, {
      body: validRefreshToken,
    });
  typia.assert(initialResponse);

  // Extract the refresh token from the response
  const currentRefreshToken = initialResponse.token.refresh;

  // Attempt to refresh using the same refresh token - which should now be invalid
  // This simulates token reuse or expiration behavior
  await TestValidator.error(
    "refresh should fail with previously used refresh token",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: currentRefreshToken,
      });
    },
  );
}
