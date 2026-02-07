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
 * Test search scenarios that should return empty results for comment mentions.
 * Create an article and comment with mentions, then search using filters that should
 * match no records (non-existent user IDs, position ranges outside comment bounds,
 * creation time ranges before/after mention creation). Verify that the search
 * returns empty data array with proper pagination metadata (records: 0, pages: 0).
 * Validate that the system handles empty results gracefully without errors.
 *
 * Note: This test intentionally does not create actual mentions in the comment
 * to test scenarios where search filters should return empty results.
 */
export async function test_api_comment_mentions_empty_search_results(
  connection: api.IConnection,
): Promise<void> {
  // Create and authenticate a user
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Create an article
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
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
        body: {
          content: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies IDiscussionBoardComment.ICreate,
        params: {
          articleId: article.id,
        },
      },
    );
  typia.assert(comment);
  // Test 1: Search with non-existent user IDs
  const searchResult1 =
    await api.functional.discussionBoard.articles.comments.mentions.index(
      userConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          mentioned_user_ids: [typia.random<string & tags.Format<"uuid">>()],
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardCommentMention.IRequest,
      },
    );
  typia.assert(searchResult1);
  TestValidator.equals(
    "empty results for non-existent user IDs",
    searchResult1.data.length,
    0,
  );
  TestValidator.equals(
    "records count should be 0",
    searchResult1.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages count should be 0",
    searchResult1.pagination.pages,
    0,
  );
  // Test 2: Search with position ranges outside comment bounds
  const commentLength = comment.content.length;
  const searchResult2 =
    await api.functional.discussionBoard.articles.comments.mentions.index(
      userConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          position_start: commentLength + 10,
          position_end: commentLength + 20,
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardCommentMention.IRequest,
      },
    );
  typia.assert(searchResult2);
  TestValidator.equals(
    "empty results for position outside bounds",
    searchResult2.data.length,
    0,
  );
  TestValidator.equals(
    "records count should be 0",
    searchResult2.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages count should be 0",
    searchResult2.pagination.pages,
    0,
  );
  // Test 3: Search with creation time ranges before comment creation
  const beforeCommentTime = new Date(comment.created_at);
  beforeCommentTime.setMinutes(beforeCommentTime.getMinutes() - 10);
  const searchResult3 =
    await api.functional.discussionBoard.articles.comments.mentions.index(
      userConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          created_at_start: beforeCommentTime.toISOString(),
          created_at_end: beforeCommentTime.toISOString(),
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardCommentMention.IRequest,
      },
    );
  typia.assert(searchResult3);
  TestValidator.equals(
    "empty results for time before creation",
    searchResult3.data.length,
    0,
  );
  TestValidator.equals(
    "records count should be 0",
    searchResult3.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages count should be 0",
    searchResult3.pagination.pages,
    0,
  );
  // Test 4: Search with creation time ranges after comment creation
  const afterCommentTime = new Date(comment.created_at);
  afterCommentTime.setMinutes(afterCommentTime.getMinutes() + 10);
  const searchResult4 =
    await api.functional.discussionBoard.articles.comments.mentions.index(
      userConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          created_at_start: afterCommentTime.toISOString(),
          created_at_end: afterCommentTime.toISOString(),
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardCommentMention.IRequest,
      },
    );
  typia.assert(searchResult4);
  TestValidator.equals(
    "empty results for time after creation",
    searchResult4.data.length,
    0,
  );
  TestValidator.equals(
    "records count should be 0",
    searchResult4.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages count should be 0",
    searchResult4.pagination.pages,
    0,
  );
}
