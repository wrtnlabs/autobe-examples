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
export async function test_api_article_comments_filtered_by_author(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random articleId and author_id
  const articleId: string = typia.random<string & tags.Format<"uuid">>();
  const authorId: string = typia.random<string & tags.Format<"uuid">>();
  // Create the request parameters
  const filterParams: IDiscussionBoardArticleComment.IRequest = {
    page: 1,
    limit: 10,
    author_id: authorId,
  } satisfies IDiscussionBoardArticleComment.IRequest;
  // Call the index endpoint with the generated parameters
  const result: IPageIDiscussionBoardArticleComment.ISummary =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId,
      body: filterParams,
    });
  typia.assert(result);
  // Validate the response structure matches the expected type
  TestValidator.equals("pagination page", result.pagination.current, 1);
  TestValidator.equals("pagination limit", result.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    result.pagination.pages >= 0,
  );
  // Validate data array structure
  TestValidator.predicate("data is an array", Array.isArray(result.data));
  // Validate each comment in the data array if any exist
  for (const comment of result.data) {
    TestValidator.equals("comment id format", typeof comment.id, "string");
    TestValidator.predicate(
      "comment id is UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        comment.id,
      ),
    );
    TestValidator.equals(
      "comment content type",
      typeof comment.content,
      "string",
    );
    TestValidator.equals(
      "comment created_at format",
      typeof comment.created_at,
      "string",
    );
    TestValidator.predicate(
      "created_at matches ISO format",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(comment.created_at),
    );
    TestValidator.equals(
      "comment upvote_count type",
      typeof comment.upvote_count,
      "number",
    );
    TestValidator.predicate(
      "upvote_count is non-negative",
      comment.upvote_count >= 0,
    );
    TestValidator.equals(
      "comment downvote_count type",
      typeof comment.downvote_count,
      "number",
    );
    TestValidator.predicate(
      "downvote_count is non-negative",
      comment.downvote_count >= 0,
    );
    TestValidator.equals(
      "comment reply_count type",
      typeof comment.reply_count,
      "number",
    );
    TestValidator.predicate(
      "reply_count is non-negative",
      comment.reply_count >= 0,
    );
    TestValidator.equals(
      "comment has_replies type",
      typeof comment.has_replies,
      "boolean",
    );
    TestValidator.equals(
      "comment author id type",
      typeof comment.author.id,
      "string",
    );
    TestValidator.predicate(
      "author id is UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        comment.author.id,
      ),
    );
    TestValidator.equals(
      "comment author username type",
      typeof comment.author.username,
      "string",
    );
    TestValidator.predicate(
      "author username length",
      comment.author.username.length >= 3,
    );
    TestValidator.predicate(
      "author username length",
      comment.author.username.length <= 50,
    );
    TestValidator.equals(
      "comment author account_status type",
      typeof comment.author.account_status,
      "string",
    );
    TestValidator.predicate(
      "author account_status is valid",
      ["active", "suspended", "banned"].includes(comment.author.account_status),
    );
    TestValidator.equals(
      "comment article_id type",
      typeof comment.article_id,
      "string",
    );
    TestValidator.predicate(
      "article_id is UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        comment.article_id,
      ),
    );
    TestValidator.equals(
      "comment is_flagged type",
      typeof comment.is_flagged,
      "boolean",
    );
    typia.assert<"up" | "down" | "none">(comment.is_my_vote);
    TestValidator.equals(
      "comment is_my_vote type",
      typeof comment.is_my_vote,
      "string",
    );
    TestValidator.predicate(
      "comment is_my_vote is valid",
      ["up", "down", "none"].includes(comment.is_my_vote)
    );
    TestValidator.equals(
      "comment report_summary type",
      typeof comment.report_summary,
      "string",
    ); // From DTO definition
    TestValidator.predicate(
      "reactions object exists",
      comment.reactions !== undefined,
    );
    if (comment.reactions.like !== undefined) {
      TestValidator.equals(
        "reactions like type",
        typeof comment.reactions.like,
        "number",
      );
      TestValidator.predicate(
        "reactions like is non-negative",
        comment.reactions.like >= 0,
      );
    }
    if (comment.reactions.laugh !== undefined) {
      TestValidator.equals(
        "reactions laugh type",
        typeof comment.reactions.laugh,
        "number",
      );
      TestValidator.predicate(
        "reactions laugh is non-negative",
        comment.reactions.laugh >= 0,
      );
    }
    if (comment.reactions.support !== undefined) {
      TestValidator.equals(
        "reactions support type",
        typeof comment.reactions.support,
        "number",
      );
      TestValidator.predicate(
        "reactions support is non-negative",
        comment.reactions.support >= 0,
      );
    }
    if (comment.reactions.surprised !== undefined) {
      TestValidator.equals(
        "reactions surprised type",
        typeof comment.reactions.surprised,
        "number",
      );
      TestValidator.predicate(
        "reactions surprised is non-negative",
        comment.reactions.surprised >= 0,
      );
    }
    if (comment.reactions.care !== undefined) {
      TestValidator.equals(
        "reactions care type",
        typeof comment.reactions.care,
        "number",
      );
      TestValidator.predicate(
        "reactions care is non-negative",
        comment.reactions.care >= 0,
      );
    }
  }
}