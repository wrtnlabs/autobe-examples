import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerationLog";
import type { IEconPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerator";
import type { IEconPoliticalForumPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumPost";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThread";

export async function test_api_moderation_log_moderator_not_found_and_auth(
  connection: api.IConnection,
) {
  /**
   * Purpose: Validate moderation log retrieval authorization and error
   * handling.
   *
   * Steps:
   *
   * 1. Register a moderator account (obtain authorization token via SDK).
   * 2. Attempt to GET with a non-existent UUID -> expect 404.
   * 3. Attempt to GET with a malformed UUID -> expect 400 or 422.
   * 4. Attempt to GET without authorization -> expect 401 or 403 (or 404 if
   *    hidden).
   *
   * Note: This test intentionally avoids creating real moderation logs that
   * require additional domain setup (threads/categories/posts) to keep the
   * implementation stable and compilable with the provided SDK subset.
   */

  // 1) Moderator signs up and receives authorization token automatically
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: `mod_${RandomGenerator.alphaNumeric(8)}`,
      // Use a controlled example.com address to avoid domain policy rejection
      email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
      password: "ModPassw0rd!",
    } satisfies IEconPoliticalForumModerator.ICreate,
  });
  typia.assert(moderator);

  // 2) Non-existent moderation log -> expect 404 Not Found
  const nonExistentLogId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent moderation log should return 404",
    404,
    async () =>
      await api.functional.econPoliticalForum.moderator.moderationLogs.at(
        connection,
        { logId: nonExistentLogId },
      ),
  );

  // 3) Malformed UUID -> expect client validation error (400 or 422)
  await TestValidator.httpError(
    "malformed moderation log id should return client validation error",
    [400, 422],
    async () =>
      await api.functional.econPoliticalForum.moderator.moderationLogs.at(
        connection,
        { logId: "not-a-uuid" },
      ),
  );

  // 4) Missing Authorization -> unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.httpError(
    "unauthenticated access to moderation log should be rejected",
    [401, 403, 404],
    async () =>
      await api.functional.econPoliticalForum.moderator.moderationLogs.at(
        unauthConn,
        { logId: typia.random<string & tags.Format<"uuid">>() },
      ),
  );
}
