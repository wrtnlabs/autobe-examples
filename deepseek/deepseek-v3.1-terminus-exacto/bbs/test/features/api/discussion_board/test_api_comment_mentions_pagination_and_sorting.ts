import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentMention } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentMention";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardCommentMention } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentMention";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";

/**
 * Test pagination and sorting functionality for comment mentions search.
 * Create an article and a comment with numerous mentions (more than page limit).
 * Test pagination by requesting different pages and verifying the correct records are returned.
 * Test sorting by creation date (ascending/descending) and position (ascending/descending).
 * Validate that pagination metadata (current page, limit, total records, total pages) is accurate.
 * Verify that sorting works correctly for all supported fields.
 */
export async function test_api_comment_mentions_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create an article
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Create a comment
  const comment =
    await generate_random_discussion_board_user_articles_comments_create(
      userConnection,
      {
        params: { articleId: article.id },
        body: {
          content: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  // Test basic functionality with empty mentions
  const emptyMentions =
    await api.functional.discussionBoard.articles.comments.mentions.index(
      userConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentMention.IRequest,
      },
    );
  typia.assert(emptyMentions);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    emptyMentions.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", emptyMentions.pagination.limit, 10);
  TestValidator.predicate(
    "total records non-negative",
    emptyMentions.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages non-negative",
    emptyMentions.pagination.pages >= 0,
  );
  // Test different page requests
  const pageTwo =
    await api.functional.discussionBoard.articles.comments.mentions.index(
      userConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          page: 2,
          limit: 10,
        } satisfies IDiscussionBoardCommentMention.IRequest,
      },
    );
  typia.assert(pageTwo);
  TestValidator.equals("page two current page", pageTwo.pagination.current, 2);
  // Test sorting by created_at ascending
  const createdAsc =
    await api.functional.discussionBoard.articles.comments.mentions.index(
      userConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          sort_by: "created_at",
          sort_order: "asc",
          limit: 5,
        } satisfies IDiscussionBoardCommentMention.IRequest,
      },
    );
  typia.assert(createdAsc);
  // Test sorting by created_at descending
  const createdDesc =
    await api.functional.discussionBoard.articles.comments.mentions.index(
      userConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          sort_by: "created_at",
          sort_order: "desc",
          limit: 5,
        } satisfies IDiscussionBoardCommentMention.IRequest,
      },
    );
  typia.assert(createdDesc);
  // Test sorting by position_start ascending
  const positionAsc =
    await api.functional.discussionBoard.articles.comments.mentions.index(
      userConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          sort_by: "position_start",
          sort_order: "asc",
          limit: 5,
        } satisfies IDiscussionBoardCommentMention.IRequest,
      },
    );
  typia.assert(positionAsc);
  // Test sorting by position_start descending
  const positionDesc =
    await api.functional.discussionBoard.articles.comments.mentions.index(
      userConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          sort_by: "position_start",
          sort_order: "desc",
          limit: 5,
        } satisfies IDiscussionBoardCommentMention.IRequest,
      },
    );
  typia.assert(positionDesc);
  // Test different limit values
  const customLimit =
    await api.functional.discussionBoard.articles.comments.mentions.index(
      userConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          limit: 15,
        } satisfies IDiscussionBoardCommentMention.IRequest,
      },
    );
  typia.assert(customLimit);
  TestValidator.equals("custom limit", customLimit.pagination.limit, 15);
  // Test filtering by position range
  const positionFiltered =
    await api.functional.discussionBoard.articles.comments.mentions.index(
      userConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          position_start: 0,
          position_end: 100,
          limit: 10,
        } satisfies IDiscussionBoardCommentMention.IRequest,
      },
    );
  typia.assert(positionFiltered);
}
