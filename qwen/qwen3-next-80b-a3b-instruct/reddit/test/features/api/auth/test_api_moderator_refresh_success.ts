import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBBSModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSModerator";

export async function test_api_moderator_refresh_success(
  connection: api.IConnection,
) {
  // Generate a valid refresh token using typia.random for ICommunityBBSModerator.IRefresh
  const refreshToken: ICommunityBBSModerator.IRefresh =
    typia.random<ICommunityBBSModerator.IRefresh>();

  // Call the refresh endpoint with the generated refresh token
  const response: ICommunityBBSModerator.IAuthorized =
    await api.functional.auth.moderator.refresh(connection, {
      body: refreshToken,
    });

  // Verify the response structure and type safety with typia.assert()
  typia.assert(response);
}
