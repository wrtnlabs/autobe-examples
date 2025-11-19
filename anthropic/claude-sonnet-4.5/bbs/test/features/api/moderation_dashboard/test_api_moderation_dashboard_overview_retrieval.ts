import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerationDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationDashboard";
import type { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test moderator dashboard overview retrieval functionality.
 *
 * This test validates that authenticated moderators can successfully retrieve
 * the real-time moderation dashboard overview containing all key metrics and
 * pending tasks. The dashboard provides essential information for moderators'
 * daily workflow including pending reports, flagged articles, active
 * suspensions, and recent moderation activity.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a moderator account
 * 2. Retrieve the moderation dashboard overview
 * 3. Validate dashboard response structure and data integrity
 */
export async function test_api_moderation_dashboard_overview_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Retrieve moderation dashboard overview
  const dashboard: IDiscussionBoardModerationDashboard =
    await api.functional.discussionBoard.moderator.dashboard.moderation.overview.at(
      connection,
    );
  typia.assert(dashboard);
}
