import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardModerator";

export async function test_api_moderator_refresh_invalid_token(
  connection: api.IConnection,
) {
  // Generate a valid refresh token format but with invalid signature
  const invalidRefreshToken = `${RandomGenerator.alphaNumeric(10)}.${RandomGenerator.alphaNumeric(10)}.${RandomGenerator.alphaNumeric(10)}`;

  // Verify that server returns 401 Unauthorized for malformed token
  await TestValidator.error(
    "invalid refresh token should return 401 Unauthorized",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: invalidRefreshToken,
      });
    },
  );
}
