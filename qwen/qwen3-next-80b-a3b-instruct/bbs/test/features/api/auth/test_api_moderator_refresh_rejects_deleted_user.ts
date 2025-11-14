import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_refresh_rejects_deleted_user(
  connection: api.IConnection,
) {
  // Generate a mock moderator ID that does not exist in the system
  const nonExistentModeratorId = typia.random<string & tags.Format<"uuid">>();

  // Construct a refresh token string in the correct format (refresh_ + UUID)
  // This token is associated with a moderator that does not exist
  const invalidRefreshToken = `refresh_${nonExistentModeratorId}`;

  // Attempt to refresh a token associated with a non-existent moderator
  // This should fail with 401 Unauthorized because the associated moderator was deleted (or never existed)
  await TestValidator.error(
    "refresh should fail for token associated with non-existent moderator",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: {
          refresh_token: invalidRefreshToken,
        } satisfies IPoliticalForumModerator.IRefresh,
      });
    },
  );
}
