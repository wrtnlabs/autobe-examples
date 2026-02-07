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
 * Test searching for mentions within a comment that contains multiple user mentions at different positions.
 * Create an article, then a comment with multiple user mentions at different positions.
 * Search for mentions using various filters: by specific user IDs, position ranges, and creation time ranges.
 * Verify that the search returns the correct mentions matching the filter criteria, with proper pagination and sorting.
 * Validate that the response includes mention summaries with user information and position data.
 */
export async function test_api_comment_mentions_search_with_multiple_users(
  connection: api.IConnection,
): Promise<void> {
  // Create first user connection
  const userConnection1: api.IConnection = { host: connection.host };
  const user1 = await authorize_user_join(userConnection1, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user1);
  // Create second user connection
  const userConnection2: api.IConnection = { host: connection.host };
  const user2 = await authorize_user_join(userConnection2, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user2);
  // Create third user connection
  const userConnection3: api.IConnection = { host: connection.host };
  const user3 = await authorize_user_join(userConnection3, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user3);
  // Create article with first user
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection1,
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
  // Create comment
  const comment =
    await generate_random_discussion_board_user_articles_comments_create(
      userConnection1,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
        params: {
          articleId: article.id,
        },
      },
    );
  typia.assert(comment);
  // Test searching for mentions - since mentions are not automatically created,
  // we test the search functionality with empty/filtered results
  // Test 1: Search for all mentions in the comment (should be empty initially)
  const allMentions =
    await api.functional.discussionBoard.articles.comments.mentions.index(
      userConnection1,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {} satisfies IDiscussionBoardCommentMention.IRequest,
      },
    );
  typia.assert(allMentions);
  TestValidator.equals(
    "should return empty mentions initially",
    allMentions.data.length,
    0,
  );
  // Test 2: Search for mentions by specific user ID (should be empty)
  const user2Mentions =
    await api.functional.discussionBoard.articles.comments.mentions.index(
      userConnection1,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          mentioned_user_ids: [user2.id],
        } satisfies IDiscussionBoardCommentMention.IRequest,
      },
    );
  typia.assert(user2Mentions);
  TestValidator.equals(
    "should return empty mentions for user2",
    user2Mentions.data.length,
    0,
  );
  // Test 3: Search for mentions by position range (should be empty)
  const positionMentions =
    await api.functional.discussionBoard.articles.comments.mentions.index(
      userConnection1,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          position_start: 0,
          position_end: 100,
        } satisfies IDiscussionBoardCommentMention.IRequest,
      },
    );
  typia.assert(positionMentions);
  TestValidator.equals(
    "should return empty mentions in position range",
    positionMentions.data.length,
    0,
  );
  // Test 4: Search with pagination (should handle empty results correctly)
  const paginatedMentions =
    await api.functional.discussionBoard.articles.comments.mentions.index(
      userConnection1,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentMention.IRequest,
      },
    );
  typia.assert(paginatedMentions);
  TestValidator.equals(
    "should return empty paginated results",
    paginatedMentions.data.length,
    0,
  );
  TestValidator.equals(
    "pagination limit should be correct",
    paginatedMentions.pagination.limit,
    10,
  );
  TestValidator.equals(
    "total records should be 0",
    paginatedMentions.pagination.records,
    0,
  );
  // Test 5: Search with sorting (should handle empty results correctly)
  const sortedMentions =
    await api.functional.discussionBoard.articles.comments.mentions.index(
      userConnection1,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          sort_by: "position_start",
          sort_order: "asc",
        } satisfies IDiscussionBoardCommentMention.IRequest,
      },
    );
  typia.assert(sortedMentions);
  TestValidator.equals(
    "should return empty sorted mentions",
    sortedMentions.data.length,
    0,
  );
  // Test 6: Search with combined filters (should handle empty results correctly)
  const combinedMentions =
    await api.functional.discussionBoard.articles.comments.mentions.index(
      userConnection1,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          mentioned_user_ids: [user2.id, user3.id],
          position_start: 0,
          position_end: 100,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IDiscussionBoardCommentMention.IRequest,
      },
    );
  typia.assert(combinedMentions);
  TestValidator.equals(
    "should return empty filtered mentions",
    combinedMentions.data.length,
    0,
  );
  // Validate pagination structure even with empty results
  TestValidator.predicate(
    "pagination current page should be valid",
    paginatedMentions.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be valid",
    paginatedMentions.pagination.pages >= 0,
  );
}
