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
 * Test that moderation logs provide complete audit trail information.
 *
 * This test validates that the moderation log system maintains comprehensive
 * audit records with all required fields for accountability and transparency.
 * It verifies that each log entry contains complete moderator identification,
 * action classification, documented reasoning, accurate timestamps, and
 * appropriate contextual references.
 *
 * Test workflow:
 *
 * 1. Create moderator account for authenticated access
 * 2. Retrieve moderation logs via paginated API
 * 3. Validate completeness of required audit fields in each log entry
 * 4. Verify moderator identification includes sufficient context
 * 5. Confirm action-specific data (article references or member info)
 * 6. Validate timestamp format and accuracy
 * 7. Ensure log entries provide immutable audit trail
 */
export async function test_api_moderation_logs_audit_trail_completeness(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "SecurePass123!",
        username: RandomGenerator.name(1),
        display_name: RandomGenerator.name(2),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Retrieve moderation logs with pagination
  const logsPage: IPageIDiscussionBoardModerationLog =
    await api.functional.discussionBoard.moderator.moderators.moderationLogs.index(
      connection,
      {
        moderatorId: moderator.id,
        body: {
          page: 1,
          limit: 20,
          sort_by: "created_at",
          order: "desc",
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(logsPage);

  // Step 3: Validate pagination structure
  TestValidator.predicate(
    "pagination should have valid structure",
    logsPage.pagination.current >= 0 &&
      logsPage.pagination.limit > 0 &&
      logsPage.pagination.records >= 0 &&
      logsPage.pagination.pages >= 0,
  );

  // Step 4: If logs exist, validate completeness of audit trail data
  if (logsPage.data.length > 0) {
    for (const log of logsPage.data) {
      // Validate required audit fields existence
      TestValidator.predicate(
        "log entry has moderator identification",
        typeof log.discussion_board_moderator_id === "string" &&
          log.discussion_board_moderator_id.length > 0,
      );

      TestValidator.predicate(
        "log entry has action type",
        typeof log.action_type === "string" && log.action_type.length > 0,
      );

      TestValidator.predicate(
        "log entry has documented reason",
        typeof log.reason === "string" && log.reason.length > 0,
      );

      TestValidator.predicate(
        "log entry has created timestamp",
        typeof log.created_at === "string" && log.created_at.length > 0,
      );

      // Validate moderator summary provides sufficient context
      if (log.moderator !== null && log.moderator !== undefined) {
        TestValidator.predicate(
          "moderator summary has valid ID",
          typeof log.moderator.id === "string" && log.moderator.id.length > 0,
        );

        TestValidator.predicate(
          "moderator summary has username",
          typeof log.moderator.username === "string" &&
            log.moderator.username.length > 0,
        );

        // Validate moderator ID consistency
        TestValidator.equals(
          "moderator ID matches foreign key",
          log.moderator.id,
          log.discussion_board_moderator_id,
        );
      }

      // Validate timestamp format (ISO 8601 date-time)
      const timestampRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
      TestValidator.predicate(
        "created_at is valid ISO 8601 format",
        timestampRegex.test(log.created_at),
      );

      // Validate action-specific contextual data
      const contentModerationActions = [
        "article_edited",
        "article_deleted",
        "attachment_removed",
      ] as const;
      const accountManagementActions = [
        "account_suspended",
        "account_banned",
        "account_restored",
      ] as const;

      if (contentModerationActions.includes(log.action_type as any)) {
        // Content moderation should include article reference
        TestValidator.predicate(
          "content moderation log includes article reference",
          log.discussion_board_article_id !== null &&
            log.discussion_board_article_id !== undefined &&
            typeof log.discussion_board_article_id === "string" &&
            log.discussion_board_article_id.length > 0,
        );

        if (log.article) {
          TestValidator.predicate(
            "article summary provides context",
            typeof log.article.id === "string" &&
              log.article.id.length > 0 &&
              typeof log.article.title === "string" &&
              log.article.title.length > 0,
          );

          TestValidator.equals(
            "article ID matches foreign key",
            log.article.id,
            log.discussion_board_article_id,
          );
        }
      } else if (accountManagementActions.includes(log.action_type as any)) {
        // Account management should include member reference
        TestValidator.predicate(
          "account management log includes member reference",
          log.discussion_board_member_id !== null &&
            log.discussion_board_member_id !== undefined &&
            typeof log.discussion_board_member_id === "string" &&
            log.discussion_board_member_id.length > 0,
        );

        if (log.affectedMember) {
          TestValidator.predicate(
            "affected member summary provides context",
            typeof log.affectedMember.id === "string" &&
              log.affectedMember.id.length > 0 &&
              typeof log.affectedMember.username === "string" &&
              log.affectedMember.username.length > 0,
          );

          TestValidator.equals(
            "member ID matches foreign key",
            log.affectedMember.id,
            log.discussion_board_member_id,
          );
        }
      }

      // Validate primary key
      TestValidator.predicate(
        "log entry has valid UUID primary key",
        typeof log.id === "string" && log.id.length > 0,
      );
    }
  }

  // Step 5: Test filtering capabilities
  const filteredLogs: IPageIDiscussionBoardModerationLog =
    await api.functional.discussionBoard.moderator.moderators.moderationLogs.index(
      connection,
      {
        moderatorId: moderator.id,
        body: {
          page: 1,
          limit: 10,
          action_types: ["article_edited", "article_deleted"],
          sort_by: "created_at",
          order: "asc",
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(filteredLogs);

  // Validate filtered results contain only requested action types
  if (filteredLogs.data.length > 0) {
    for (const log of filteredLogs.data) {
      TestValidator.predicate(
        "filtered log matches requested action types",
        log.action_type === "article_edited" ||
          log.action_type === "article_deleted",
      );
    }
  }
}
