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
 * Test that retrieved moderation log entries include complete moderator context
 * for accountability.
 *
 * This test validates that each moderation log entry contains full moderator
 * information for audit trail transparency. The moderator authenticates and
 * retrieves a log entry, then verifies that the response includes the moderator
 * summary with username, display name, email verification status, and account
 * status.
 *
 * The test confirms that this moderator context enables:
 *
 * - Identifying who performed each action
 * - Supporting accountability reviews
 * - Pattern analysis of moderator behavior
 * - Ensuring moderation decisions can be traced back to specific moderators
 *
 * Steps:
 *
 * 1. Create and authenticate a moderator account
 * 2. Retrieve a moderation log entry by ID
 * 3. Validate the response contains complete moderator summary information
 */
export async function test_api_moderation_log_detail_moderator_context(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphaNumeric(12);
  const moderatorDisplayName = RandomGenerator.name();

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "SecurePassword123!",
        username: moderatorUsername,
        display_name: moderatorDisplayName,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Retrieve a moderation log entry
  // Generate a valid UUID for the log ID to test the retrieval
  const logId = typia.random<string & tags.Format<"uuid">>();

  const moderationLog: IDiscussionBoardModerationLog =
    await api.functional.discussionBoard.moderator.moderationLogs.at(
      connection,
      {
        logId: logId,
      },
    );
  typia.assert(moderationLog);

  // Step 3: Validation complete
  // typia.assert() has already validated the entire response structure
  // including the moderator summary with all required fields:
  // - id, username, display_name, email
  // - email_verified, email_verified_at
  // - is_active, last_login_at
  // - created_at, updated_at, deleted_at
  // This ensures complete moderator context for accountability
}
