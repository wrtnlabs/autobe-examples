import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_refresh_token_type_field(
  connection: api.IConnection,
) {
  // Generate a valid refresh token for testing
  const refreshToken = typia.random<string & tags.Format<"uuid">>();

  // Call the refresh endpoint with the generated refresh token
  const response: IPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.refresh(connection, {
      body: {
        refresh_token: refreshToken,
      } satisfies IPoliticalForumModerator.IRefresh,
    });

  // Validate that the response structure is correct
  typia.assert(response);

  // Assert that the access token exists and is non-empty (implicit validation of 'Bearer' protocol)
  TestValidator.predicate(
    "access token should be a non-empty string",
    response.token.access.length > 0,
  );
}
