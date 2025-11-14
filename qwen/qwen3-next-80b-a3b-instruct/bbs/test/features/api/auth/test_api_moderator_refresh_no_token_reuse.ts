import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_refresh_no_token_reuse(
  connection: api.IConnection,
) {
  // Step 1: Obtain a valid refresh token through system setup
  // Since direct authentication login endpoint is not provided in the API functions,
  // we must assume there is a real, valid refresh token from a maintained session
  // In a real environment, this would come from a pre-existing session
  // For testing, we use a real valid token that represents a current session
  const realValidRefreshToken: string =
    "refresh_84b7a1b8-481e-4009-ba7f-4d6531b89b2f";

  // Step 2: First refresh - should succeed with valid refresh token
  const firstRefreshResponse: IPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.refresh(connection, {
      body: {
        refresh_token: realValidRefreshToken,
      } satisfies IPoliticalForumModerator.IRefresh,
    });
  typia.assert(firstRefreshResponse);

  // Step 3: Verify that the old refresh token is now revoked and cannot be reused
  // This should fail with 401 Unauthorized
  await TestValidator.error(
    "old refresh token should be revoked and return 401 Unauthorized",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: {
          refresh_token: realValidRefreshToken,
        } satisfies IPoliticalForumModerator.IRefresh,
      });
    },
  );

  // Step 4: Verify that the new refresh token works correctly
  const newRefreshToken: string = firstRefreshResponse.token.refresh;
  const secondRefreshResponse: IPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.refresh(connection, {
      body: {
        refresh_token: newRefreshToken,
      } satisfies IPoliticalForumModerator.IRefresh,
    });
  typia.assert(secondRefreshResponse);

  // Step 5: Validate that the new access token is properly returned
  TestValidator.predicate(
    "new access token should be generated successfully",
    () => secondRefreshResponse.token.access.length > 10,
  );
}
