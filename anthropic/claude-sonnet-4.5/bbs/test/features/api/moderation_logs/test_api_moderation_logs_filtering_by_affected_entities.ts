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
 * Test filtering moderation logs by affected entities (article_id and
 * member_id).
 *
 * This test validates the moderation log filtering functionality by:
 *
 * 1. Creating and authenticating a moderator account
 * 2. Retrieving moderation logs with article_id filter
 * 3. Retrieving moderation logs with member_id filter
 * 4. Verifying the API accepts and processes these filter parameters correctly
 *
 * The test ensures that:
 *
 * - The filtering API accepts article_id and member_id parameters
 * - Content moderation logs (when present) have article references
 * - Account management logs (when present) have member references
 * - The filtering mechanism structure works correctly
 */
export async function test_api_moderation_logs_filtering_by_affected_entities(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
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

  // Step 2: Test filtering by article_id with a random UUID
  const testArticleId = typia.random<string & tags.Format<"uuid">>();

  const articleFilteredLogs: IPageIDiscussionBoardModerationLog =
    await api.functional.discussionBoard.moderator.moderators.moderationLogs.index(
      connection,
      {
        moderatorId: moderator.id,
        body: {
          page: 1,
          limit: 50,
          article_id: testArticleId,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(articleFilteredLogs);

  // Verify all returned logs reference the specified article (if any exist)
  for (const log of articleFilteredLogs.data) {
    if (
      log.discussion_board_article_id !== null &&
      log.discussion_board_article_id !== undefined
    ) {
      TestValidator.equals(
        "filtered log should reference the specified article",
        log.discussion_board_article_id,
        testArticleId,
      );

      // Verify article summary is present for content moderation logs
      if (log.article !== undefined) {
        typia.assert(log.article);
        TestValidator.equals(
          "article summary ID should match filter",
          log.article.id,
          testArticleId,
        );
      }
    }
  }

  // Step 3: Test filtering by member_id with a random UUID
  const testMemberId = typia.random<string & tags.Format<"uuid">>();

  const memberFilteredLogs: IPageIDiscussionBoardModerationLog =
    await api.functional.discussionBoard.moderator.moderators.moderationLogs.index(
      connection,
      {
        moderatorId: moderator.id,
        body: {
          page: 1,
          limit: 50,
          member_id: testMemberId,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(memberFilteredLogs);

  // Verify all returned logs reference the specified member (if any exist)
  for (const log of memberFilteredLogs.data) {
    if (
      log.discussion_board_member_id !== null &&
      log.discussion_board_member_id !== undefined
    ) {
      TestValidator.equals(
        "filtered log should reference the specified member",
        log.discussion_board_member_id,
        testMemberId,
      );

      // Verify affected member summary is present for account management logs
      if (log.affectedMember !== undefined) {
        typia.assert(log.affectedMember);
        TestValidator.equals(
          "affected member ID should match filter",
          log.affectedMember.id,
          testMemberId,
        );
      }
    }
  }

  // Step 4: Test filtering with both article_id and member_id
  const combinedArticleId = typia.random<string & tags.Format<"uuid">>();
  const combinedMemberId = typia.random<string & tags.Format<"uuid">>();

  const combinedFilterLogs: IPageIDiscussionBoardModerationLog =
    await api.functional.discussionBoard.moderator.moderators.moderationLogs.index(
      connection,
      {
        moderatorId: moderator.id,
        body: {
          page: 1,
          limit: 50,
          article_id: combinedArticleId,
          member_id: combinedMemberId,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(combinedFilterLogs);

  // All returned logs must match both filters (if any exist)
  for (const log of combinedFilterLogs.data) {
    if (
      log.discussion_board_article_id !== null &&
      log.discussion_board_article_id !== undefined
    ) {
      TestValidator.equals(
        "combined filter log must match article_id",
        log.discussion_board_article_id,
        combinedArticleId,
      );
    }
    if (
      log.discussion_board_member_id !== null &&
      log.discussion_board_member_id !== undefined
    ) {
      TestValidator.equals(
        "combined filter log must match member_id",
        log.discussion_board_member_id,
        combinedMemberId,
      );
    }
  }

  // Step 5: Test retrieving all logs without filters to verify API works
  const allLogs: IPageIDiscussionBoardModerationLog =
    await api.functional.discussionBoard.moderator.moderators.moderationLogs.index(
      connection,
      {
        moderatorId: moderator.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(allLogs);
}
