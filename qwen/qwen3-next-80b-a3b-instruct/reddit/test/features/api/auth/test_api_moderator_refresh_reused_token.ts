import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBBSModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSModerator";

export async function test_api_moderator_refresh_reused_token(
  connection: api.IConnection,
) {
  // Step 1: Obtain a valid refresh token by authenticating as a moderator
  const refreshToken: ICommunityBBSModerator.IRefresh =
    RandomGenerator.alphaNumeric(100);

  // Step 2: Use the refresh token to obtain a new access token
  const firstResponse: ICommunityBBSModerator.IAuthorized =
    await api.functional.auth.moderator.refresh(connection, {
      body: refreshToken,
    });
  typia.assert(firstResponse);

  // Step 3: Try to reuse the same refresh token for another refresh operation
  // According to the scenario, this should fail with 401 Unauthorized
  // because refresh tokens are one-time use
  await TestValidator.error(
    "reused refresh token should return 401 Unauthorized",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: refreshToken,
      });
    },
  );
}
