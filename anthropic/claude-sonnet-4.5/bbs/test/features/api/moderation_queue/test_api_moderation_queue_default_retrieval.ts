import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentReport";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentReport";

/**
 * Test that moderators can retrieve the moderation queue with default
 * parameters (no filters applied).
 *
 * This scenario validates the basic moderation queue retrieval functionality
 * where a moderator accesses the queue without any search criteria to see all
 * content reports. The test verifies that the response includes proper
 * pagination metadata (current page, limit, total records, total pages) and a
 * data array containing content report summaries.
 *
 * Each report summary should include all required fields: id,
 * discussion_board_article_id, discussion_board_member_id, report_category,
 * status, created_at, and optional fields like resolved_by_moderator_id,
 * report_details, resolution_notes, and resolved_at.
 *
 * The default behavior should return reports sorted by created_at in ascending
 * order (oldest first) to prioritize reports requiring urgent attention. This
 * test validates the entry point for the content review workflow and ensures
 * moderators can access the complete queue for moderation decisions.
 */
export async function test_api_moderation_queue_default_retrieval(
  connection: api.IConnection,
) {
  // 1. Create moderator account with authentication tokens
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorData = {
    email: moderatorEmail,
    password: "SecureModPassword123!",
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

  // 2. Retrieve moderation queue with default parameters (no filters)
  const queueRequest = {} satisfies IDiscussionBoardContentReport.IRequest;

  const queueResponse: IPageIDiscussionBoardContentReport.ISummary =
    await api.functional.discussionBoard.moderator.dashboard.moderation.queue.index(
      connection,
      {
        body: queueRequest,
      },
    );
  typia.assert(queueResponse);

  // 3. Validate response structure - typia.assert already validated all types
  TestValidator.predicate(
    "pagination object should exist",
    queueResponse.pagination !== null && queueResponse.pagination !== undefined,
  );

  TestValidator.predicate(
    "data array should exist and be an array",
    Array.isArray(queueResponse.data),
  );
}
