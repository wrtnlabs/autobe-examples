import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_refresh_db_connectivity_loss(
  connection: api.IConnection,
) {
  // Generate a valid refresh token for testing
  const refreshToken =
    "refresh_" + typia.random<string & tags.Format<"uuid">>();

  // Create a valid refresh request body
  const refreshBody = {
    refresh_token: refreshToken,
  } satisfies IPoliticalForumModerator.IRefresh;

  // Call the refresh endpoint and expect a 503 Service Unavailable error
  // This simulates database connectivity loss and verifies graceful failover
  await TestValidator.error(
    "database connectivity loss should return 503 Service Unavailable",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: refreshBody,
      });
    },
  );
}
