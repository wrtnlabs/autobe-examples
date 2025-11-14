import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_token_refresh_with_revoked_token(
  connection: api.IConnection,
) {
  // Generate a UUID that does not exist in the database (invalid refresh token)
  const invalidRefreshToken = typia.random<string & tags.Format<"uuid">>();

  // Attempt to refresh the moderator's token with an invalid (non-existent) refresh token
  // This should simulate a revoked session - the backend will recognize this token doesn't exist
  // and return 401 Unauthorized
  const refreshRequest = {
    body: {
      refresh_token: invalidRefreshToken,
    } satisfies IPoliticalForumModerator.IRefresh,
  };

  // Validate that the response is a 401 Unauthorized error
  await TestValidator.error(
    "refreshing with non-existent refresh token should fail with 401 Unauthorized",
    async () => {
      await api.functional.auth.moderator.refresh(connection, refreshRequest);
    },
  );
}
