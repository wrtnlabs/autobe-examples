import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_moderator_token_refresh_missing_session(
  connection: api.IConnection,
) {
  // Step 1: Create a refresh token with valid structure but missing session
  // Simulate a token that appears structurally valid but corresponds to a deleted session
  const orphanedRefreshToken = typia.random<string>();

  // Step 2: Attempt to refresh with the orphaned token
  // The backend should validate the token structure but fail when querying the session store
  // and finding no matching active session for this refresh token
  await TestValidator.error(
    "refresh with missing session should reject",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: {
          refresh_token: orphanedRefreshToken,
        } satisfies IDiscussionBoardModerator.IRefresh,
      });
    },
  );
}
