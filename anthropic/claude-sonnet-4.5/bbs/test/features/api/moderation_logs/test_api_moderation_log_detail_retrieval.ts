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
 * Test retrieving detailed information about a specific moderation log entry.
 *
 * This test validates that moderators can access complete details about
 * individual moderation actions for accountability, transparency, and dispute
 * resolution. The test creates a new moderator account through authentication,
 * then retrieves a specific log entry using its UUID identifier.
 *
 * Test Flow:
 *
 * 1. Create and authenticate a new moderator account
 * 2. Retrieve a specific moderation log entry by ID
 * 3. Validate the response contains all required log entry fields
 *
 * Validates:
 *
 * - Moderator authentication and authorization
 * - Log entry detail retrieval functionality
 * - Complete audit trail information accessibility
 * - Response data structure and type correctness
 */
export async function test_api_moderation_log_detail_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
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

  // Step 2: Retrieve a specific moderation log entry by its unique identifier
  const logId = typia.random<string & tags.Format<"uuid">>();

  const logEntry: IDiscussionBoardModerationLog =
    await api.functional.discussionBoard.moderator.moderationLogs.at(
      connection,
      {
        logId: logId,
      },
    );

  // Step 3: Validate the response contains all required moderation log fields
  typia.assert(logEntry);
}
