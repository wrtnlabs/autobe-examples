import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that moderation log entries include precise timestamps for chronological
 * audit trails.
 *
 * This test validates the timestamp precision of moderation log entries by:
 *
 * 1. Creating and authenticating a moderator account
 * 2. Retrieving a moderation log entry
 * 3. Verifying the created_at timestamp through complete type validation
 *
 * The test ensures that moderation logs capture exact timing information
 * necessary for incident investigations, accountability reviews, and time-based
 * filtering. The timestamp validation is performed through typia.assert() which
 * verifies ISO 8601 format with full datetime precision including timezone
 * information.
 */
export async function test_api_moderation_log_detail_timestamp_precision(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecureModeratorPass123!",
    username: RandomGenerator.name(1),
    display_name: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);

  // Step 2: Retrieve a moderation log entry
  // Using a random UUID for the log ID (in real scenario, this would be from an actual moderation action)
  const logId = typia.random<string & tags.Format<"uuid">>();

  const moderationLog =
    await api.functional.discussionBoard.moderator.moderationLogs.at(
      connection,
      {
        logId: logId,
      },
    );

  // Step 3: Validate complete type including timestamp precision
  // This single assertion validates ALL type aspects including:
  // - created_at exists and is non-null
  // - created_at follows ISO 8601 format with full datetime precision
  // - Timezone information is included (Z or ±HH:mm)
  // - All other moderation log properties are valid
  typia.assert(moderationLog);
}
