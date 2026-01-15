import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommentReactions } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommentReactions";
import type { IDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleComment";
import type { IDiscussionBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCitizen";
import type { IDiscussionBoardCommentModAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentModAction";
import type { IDiscussionBoardCommentReportSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentReportSummary";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleComment";
export async function test_api_article_comments_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Use the existing article ID directly since we don't have article creation or authentication endpoints
  const existingArticleId = "c48b8e32-5e26-4c5a-bf8e-9f3f2c743f46";
  // Step 2: Test comment retrieval with pagination and validations
  const page = 1;
  const limit = 10;
  const response: IPageIDiscussionBoardArticleComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(
      connection, // Use base connection directly since no authentication required
      {
        articleId: existingArticleId,
        body: {
          page,
          limit,
          sort_by: "created_at",
          sort_order: "desc",
          status: "active",
        } satisfies IDiscussionBoardArticleComment.IRequest,
      },
    );
  typia.assert(response);
  // Validate pagination
  TestValidator.equals(
    "pagination page matches request",
    response.pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination limit matches request",
    response.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 1",
    response.pagination.pages >= 1,
  );
  // Validate comments exist (at least one)
  TestValidator.predicate(
    "comments array is not empty",
    response.data.length > 0,
  );
  // Validate each comment has required summary fields
  response.data.forEach((comment) => {
    // Validate required fields from IDiscussionBoardArticleComment.ISummary
    TestValidator.predicate(
      "comment id is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        comment.id,
      ),
    );
    TestValidator.predicate(
      "comment content is string and not empty",
      typeof comment.content === "string" && comment.content.length > 0,
    );
    TestValidator.predicate(
      "comment created_at is ISO date-time",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(comment.created_at),
    );
    TestValidator.predicate(
      "comment upvote_count is non-negative integer",
      Number.isInteger(comment.upvote_count) && comment.upvote_count >= 0,
    );
    TestValidator.predicate(
      "comment downvote_count is non-negative integer",
      Number.isInteger(comment.downvote_count) && comment.downvote_count >= 0,
    );
    TestValidator.predicate(
      "comment reply_count is non-negative integer",
      Number.isInteger(comment.reply_count) && comment.reply_count >= 0,
    );
    TestValidator.predicate(
      "comment has_replies is boolean",
      typeof comment.has_replies === "boolean",
    );
    // Validate author summary
    TestValidator.predicate(
      "author id is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        comment.author.id,
      ),
    );
    TestValidator.predicate(
      "author username is string and 3-50 chars",
      typeof comment.author.username === "string" &&
        comment.author.username.length >= 3 &&
        comment.author.username.length <= 50,
    );
    TestValidator.equals(
      "author account_status is active",
      comment.author.account_status,
      "active",
    );
    // Validate report summary (defined as string)
    TestValidator.predicate(
      "report_summary is string",
      typeof comment.report_summary === "string",
    );
    // Validate moderation actions
    TestValidator.predicate(
      "moderation_actions id is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        comment.moderation_actions.id,
      ),
    );
    TestValidator.predicate(
      "moderation_actions action_type is valid",
      [
        "hide",
        "delete",
        "warn",
        "approve",
        "unhide",
        "restore",
        "lock",
        "unlock",
        "pin",
        "unpin",
      ].includes(comment.moderation_actions.action_type),
    );
    TestValidator.predicate(
      "moderation_actions created_at is ISO date-time",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
        comment.moderation_actions.created_at,
      ),
    );
    TestValidator.equals(
      "moderation_actions status is completed",
      comment.moderation_actions.status,
      "completed",
    );
    // Validate reactions (all optional)
    if (comment.reactions.like !== undefined) {
      TestValidator.predicate(
        "reactions like is non-negative integer",
        Number.isInteger(comment.reactions.like) && comment.reactions.like >= 0,
      );
    }
    if (comment.reactions.laugh !== undefined) {
      TestValidator.predicate(
        "reactions laugh is non-negative integer",
        Number.isInteger(comment.reactions.laugh) &&
          comment.reactions.laugh >= 0,
      );
    }
    if (comment.reactions.support !== undefined) {
      TestValidator.predicate(
        "reactions support is non-negative integer",
        Number.isInteger(comment.reactions.support) &&
          comment.reactions.support >= 0,
      );
    }
    if (comment.reactions.surprised !== undefined) {
      TestValidator.predicate(
        "reactions surprised is non-negative integer",
        Number.isInteger(comment.reactions.surprised) &&
          comment.reactions.surprised >= 0,
      );
    }
    if (comment.reactions.care !== undefined) {
      TestValidator.predicate(
        "reactions care is non-negative integer",
        Number.isInteger(comment.reactions.care) && comment.reactions.care >= 0,
      );
    }
    // Validate article_id
    TestValidator.equals(
      "comment article_id matches existing article",
      comment.article_id,
      existingArticleId,
    );
    // Validate is_flagged
    TestValidator.predicate(
      "is_flagged is boolean",
      typeof comment.is_flagged === "boolean",
    );
    // Validate is_my_vote
    TestValidator.equals(
      "is_my_vote should be one of up/down/none",
      ["up", "down", "none"].includes(comment.is_my_vote),
      true,
    );
  });
}
