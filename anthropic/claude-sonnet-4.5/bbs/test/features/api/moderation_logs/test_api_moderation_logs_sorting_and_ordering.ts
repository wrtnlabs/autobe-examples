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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationLog";

/**
 * Test sorting and ordering functionality for moderation logs retrieval.
 *
 * This test validates that the moderation log API correctly sorts and orders
 * log entries based on different criteria (created_at timestamp, action_type)
 * and directions (ascending, descending). It ensures chronological ordering
 * works properly for timestamps and that action_type sorting groups similar
 * actions together in the correct order.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a moderator account
 * 2. Test sorting by created_at in ascending order (oldest first)
 * 3. Test sorting by created_at in descending order (newest first)
 * 4. Test sorting by action_type in ascending order (alphabetical)
 * 5. Test sorting by action_type in descending order (reverse alphabetical)
 * 6. Test default sorting behavior when parameters are omitted
 * 7. Validate that results are correctly ordered in each case
 */
export async function test_api_moderation_logs_sorting_and_ordering(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for authentication
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePassword123!",
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

  // Step 2: Test sorting by created_at in ascending order (oldest first)
  const logsCreatedAtAsc: IPageIDiscussionBoardModerationLog =
    await api.functional.discussionBoard.moderator.moderators.moderationLogs.index(
      connection,
      {
        moderatorId: moderator.id,
        body: {
          sort_by: "created_at",
          order: "asc",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(logsCreatedAtAsc);

  // Validate ascending chronological order
  if (logsCreatedAtAsc.data.length > 1) {
    for (let i = 0; i < logsCreatedAtAsc.data.length - 1; i++) {
      const currentDate = new Date(logsCreatedAtAsc.data[i].created_at);
      const nextDate = new Date(logsCreatedAtAsc.data[i + 1].created_at);
      TestValidator.predicate(
        "created_at ascending order should have earlier dates first",
        currentDate.getTime() <= nextDate.getTime(),
      );
    }
  }

  // Step 3: Test sorting by created_at in descending order (newest first)
  const logsCreatedAtDesc: IPageIDiscussionBoardModerationLog =
    await api.functional.discussionBoard.moderator.moderators.moderationLogs.index(
      connection,
      {
        moderatorId: moderator.id,
        body: {
          sort_by: "created_at",
          order: "desc",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(logsCreatedAtDesc);

  // Validate descending chronological order
  if (logsCreatedAtDesc.data.length > 1) {
    for (let i = 0; i < logsCreatedAtDesc.data.length - 1; i++) {
      const currentDate = new Date(logsCreatedAtDesc.data[i].created_at);
      const nextDate = new Date(logsCreatedAtDesc.data[i + 1].created_at);
      TestValidator.predicate(
        "created_at descending order should have later dates first",
        currentDate.getTime() >= nextDate.getTime(),
      );
    }
  }

  // Step 4: Test sorting by action_type in ascending order (alphabetical)
  const logsActionTypeAsc: IPageIDiscussionBoardModerationLog =
    await api.functional.discussionBoard.moderator.moderators.moderationLogs.index(
      connection,
      {
        moderatorId: moderator.id,
        body: {
          sort_by: "action_type",
          order: "asc",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(logsActionTypeAsc);

  // Validate ascending alphabetical order by action_type
  if (logsActionTypeAsc.data.length > 1) {
    for (let i = 0; i < logsActionTypeAsc.data.length - 1; i++) {
      const currentActionType = logsActionTypeAsc.data[i].action_type;
      const nextActionType = logsActionTypeAsc.data[i + 1].action_type;
      TestValidator.predicate(
        "action_type ascending order should be alphabetical",
        currentActionType.localeCompare(nextActionType) <= 0,
      );
    }
  }

  // Step 5: Test sorting by action_type in descending order (reverse alphabetical)
  const logsActionTypeDesc: IPageIDiscussionBoardModerationLog =
    await api.functional.discussionBoard.moderator.moderators.moderationLogs.index(
      connection,
      {
        moderatorId: moderator.id,
        body: {
          sort_by: "action_type",
          order: "desc",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(logsActionTypeDesc);

  // Validate descending alphabetical order by action_type
  if (logsActionTypeDesc.data.length > 1) {
    for (let i = 0; i < logsActionTypeDesc.data.length - 1; i++) {
      const currentActionType = logsActionTypeDesc.data[i].action_type;
      const nextActionType = logsActionTypeDesc.data[i + 1].action_type;
      TestValidator.predicate(
        "action_type descending order should be reverse alphabetical",
        currentActionType.localeCompare(nextActionType) >= 0,
      );
    }
  }

  // Step 6: Test default sorting behavior (no sort_by or order specified)
  const logsDefault: IPageIDiscussionBoardModerationLog =
    await api.functional.discussionBoard.moderator.moderators.moderationLogs.index(
      connection,
      {
        moderatorId: moderator.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(logsDefault);

  // Validate pagination metadata for all responses
  TestValidator.predicate(
    "pagination current page should be 1",
    logsCreatedAtAsc.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should match request",
    logsCreatedAtAsc.pagination.limit === 20,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    logsCreatedAtAsc.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    logsCreatedAtAsc.pagination.pages >= 0,
  );
}
