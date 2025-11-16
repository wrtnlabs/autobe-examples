import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IModerator";

export async function test_api_moderator_refresh_invalid_token_format(
  connection: api.IConnection,
) {
  // Step 1: Register a new moderator to obtain a valid refresh token
  const joinResponse: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: typia.random<IModerator.ICreate>(),
    });
  typia.assert(joinResponse);

  // Step 2: Extract the valid refresh token from the join response
  const validRefreshToken = joinResponse.token.refresh;

  // Step 3: Create an invalid refresh token by truncating the valid one
  // This simulates a malformed or truncated refresh token as specified in the scenario
  const invalidRefreshToken = validRefreshToken.substring(
    0,
    validRefreshToken.length - 10,
  );

  // Step 4: Test refreshing with the invalid (truncated) token
  // The system must reject this with a 401 Unauthorized error without internal error details
  await TestValidator.error(
    "invalid refresh token format should return 401 Unauthorized",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: invalidRefreshToken satisfies IModerator.IRefresh,
      });
    },
  );
}
