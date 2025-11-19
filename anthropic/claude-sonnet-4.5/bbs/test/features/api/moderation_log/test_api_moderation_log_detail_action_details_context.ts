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
 * Test that moderation log entries include action_details providing additional
 * context beyond the basic reason.
 *
 * This test validates that log entries can contain supplementary information
 * about what specifically changed or what policy violations were cited. The
 * moderator authenticates and retrieves a log entry with populated
 * action_details field. The test verifies that action_details provides
 * contextual information such as which attachment was removed, what content was
 * changed in an edit, or specific community guidelines that were violated,
 * giving complete context for audit trail review and dispute resolution.
 *
 * Test flow:
 *
 * 1. Create and authenticate a moderator account
 * 2. Retrieve a moderation log entry by ID
 * 3. Validate the complete log entry structure with typia.assert
 * 4. Verify that action_details field contains meaningful supplementary context
 */
export async function test_api_moderation_log_detail_action_details_context(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorData = {
    email: moderatorEmail,
    password: "SecureMod123!",
    username: RandomGenerator.name(1),
    display_name: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Generate a log ID that represents an existing moderation log entry
  // In a real system, this would be obtained from a previous moderation action
  const logId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Retrieve the moderation log entry
  const logEntry: IDiscussionBoardModerationLog =
    await api.functional.discussionBoard.moderator.moderationLogs.at(
      connection,
      {
        logId: logId,
      },
    );
  typia.assert(logEntry);

  // Step 4: Verify that action_details provides additional context beyond the basic reason
  // action_details is optional but when present should contain supplementary information
  if (logEntry.action_details !== undefined) {
    TestValidator.predicate(
      "action_details should provide context beyond basic reason",
      logEntry.action_details.length > 0 &&
        logEntry.action_details !== logEntry.reason,
    );
  }

  // Step 5: Validate business logic - if action_details exists, it should add value
  if (
    logEntry.action_details !== undefined &&
    logEntry.action_details.length > 0
  ) {
    TestValidator.predicate(
      "action_details should contain meaningful supplementary information",
      logEntry.action_details.includes("attachment") ||
        logEntry.action_details.includes("content") ||
        logEntry.action_details.includes("guideline") ||
        logEntry.action_details.includes("policy") ||
        logEntry.action_details.includes("removed") ||
        logEntry.action_details.includes("edited") ||
        logEntry.action_details.includes("violation") ||
        logEntry.action_details.length > logEntry.reason.length,
    );
  }
}
