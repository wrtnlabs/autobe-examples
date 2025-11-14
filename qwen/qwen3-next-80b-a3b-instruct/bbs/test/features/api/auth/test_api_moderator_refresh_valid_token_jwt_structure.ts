import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_refresh_valid_token_jwt_structure(
  connection: api.IConnection,
) {
  // Generate a valid refresh token that will be used for this test
  // The refresh token must be a string, as per IRefresh schema
  const refreshToken = `refresh_${typia.random<string & tags.Format<"uuid">>()}`;

  // Call the refresh endpoint with valid refresh token
  const response: IPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.refresh(connection, {
      body: {
        refresh_token: refreshToken,
      } satisfies IPoliticalForumModerator.IRefresh,
    });

  // Validate the response structure matches IPoliticalForumModerator.IAuthorized exactly
  typia.assert(response);

  // Validate the token structure matches IAuthorizationToken exactly
  typia.assert<IAuthorizationToken>(response.token);
}
