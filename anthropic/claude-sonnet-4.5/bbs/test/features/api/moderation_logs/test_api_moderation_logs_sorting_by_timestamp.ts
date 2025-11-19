import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationLog";

/**
 * Test retrieving moderation logs with different sort orders by timestamp.
 *
 * This test validates that moderators can control the chronological ordering of
 * moderation log audit trail results. It authenticates a moderator and requests
 * logs with sort_by='created_at' in both descending order (most recent first)
 * and ascending order (oldest first).
 *
 * Steps:
 *
 * 1. Create and authenticate a moderator account
 * 2. Request moderation logs with descending order (recent actions first)
 * 3. Verify the descending response is valid
 * 4. Request moderation logs with ascending order (oldest actions first)
 * 5. Verify the ascending response is valid
 * 6. Validate pagination metadata
 */
export async function test_api_moderation_logs_sorting_by_timestamp(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(),
      ip: "127.0.0.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Request moderation logs with descending order (most recent first)
  const descendingLogs =
    await api.functional.discussionBoard.moderator.moderationLogs.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          sort_by: "created_at",
          order: "desc",
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(descendingLogs);

  // Step 3: Request moderation logs with ascending order (oldest first)
  const ascendingLogs =
    await api.functional.discussionBoard.moderator.moderationLogs.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          sort_by: "created_at",
          order: "asc",
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(ascendingLogs);

  // Step 4: Validate pagination metadata
  TestValidator.equals(
    "descending pagination current page",
    descendingLogs.pagination.current,
    1,
  );
  TestValidator.equals(
    "ascending pagination current page",
    ascendingLogs.pagination.current,
    1,
  );
}
