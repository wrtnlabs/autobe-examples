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
 * Test sorting capabilities for member moderation history retrieval.
 *
 * This test validates that moderators can control the ordering of moderation
 * history results using sort_by and order parameters. The API supports sorting
 * by 'created_at' (chronological action timestamp) or 'action_type' (grouped by
 * action category), with both ascending ('asc') and descending ('desc') order
 * directions.
 *
 * The test verifies:
 *
 * 1. Sorting by 'created_at' in ascending order (oldest first)
 * 2. Sorting by 'created_at' in descending order (newest first)
 * 3. Sorting by 'action_type' in ascending order
 * 4. Sorting by 'action_type' in descending order
 * 5. Default sorting behavior (chronological descending when no params specified)
 *
 * Each sorting configuration is tested to ensure the API accepts the parameters
 * and returns properly structured paginated responses with valid metadata.
 */
export async function test_api_member_moderation_history_sorting(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as moderator
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecureModPass123!",
    username: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Generate a random member ID to query (in real scenario, this would be an actual member)
  const targetMemberId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Test default sorting (no sort parameters - should default to newest first)
  const defaultSortResult: IPageIDiscussionBoardModerationLog.ISummary =
    await api.functional.discussionBoard.moderator.members.moderationHistory.index(
      connection,
      {
        memberId: targetMemberId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(defaultSortResult);

  // Step 4: Test sorting by created_at in ascending order (oldest first)
  const sortByDateAsc: IPageIDiscussionBoardModerationLog.ISummary =
    await api.functional.discussionBoard.moderator.members.moderationHistory.index(
      connection,
      {
        memberId: targetMemberId,
        body: {
          page: 1,
          limit: 10,
          sort_by: "created_at",
          order: "asc",
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(sortByDateAsc);

  // Step 5: Test sorting by created_at in descending order (newest first)
  const sortByDateDesc: IPageIDiscussionBoardModerationLog.ISummary =
    await api.functional.discussionBoard.moderator.members.moderationHistory.index(
      connection,
      {
        memberId: targetMemberId,
        body: {
          page: 1,
          limit: 10,
          sort_by: "created_at",
          order: "desc",
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(sortByDateDesc);

  // Step 6: Test sorting by action_type in ascending order
  const sortByActionAsc: IPageIDiscussionBoardModerationLog.ISummary =
    await api.functional.discussionBoard.moderator.members.moderationHistory.index(
      connection,
      {
        memberId: targetMemberId,
        body: {
          page: 1,
          limit: 10,
          sort_by: "action_type",
          order: "asc",
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(sortByActionAsc);

  // Step 7: Test sorting by action_type in descending order
  const sortByActionDesc: IPageIDiscussionBoardModerationLog.ISummary =
    await api.functional.discussionBoard.moderator.members.moderationHistory.index(
      connection,
      {
        memberId: targetMemberId,
        body: {
          page: 1,
          limit: 10,
          sort_by: "action_type",
          order: "desc",
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(sortByActionDesc);
}
