import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";
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

export async function test_api_comment_retrieval_search_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create multiple users for author filtering
  const userConnections: api.IConnection[] = [];
  const users: IDiscussionBoardUser.IAuthorized[] = [];
  // Create 3 users with different display names
  for (let i = 0; i < 3; i++) {
    const userConn: api.IConnection = { host: connection.host };
    const user = await authorize_user_join(userConn, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: `TestUser${i} DisplayName${i}`,
      },
    });
    typia.assert(user);
    userConnections.push(userConn);
    users.push(user);
  }
  // Create article using the first user
  const article = await generate_random_discussion_board_user_articles_create(
    userConnections[0],
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      },
    },
  );
  typia.assert(article);
  // Create comments with varied content and timestamps
  const comments: IDiscussionBoardComment[] = [];
  // Create comments from different users with different content
  const commentData = [
    {
      userIndex: 0,
      content: "This is a test comment about programming",
      delay: 0,
    },
    {
      userIndex: 1,
      content: "Another comment discussing testing methodologies",
      delay: 1000,
    },
    {
      userIndex: 2,
      content: "Third comment with programming topics",
      delay: 2000,
    },
    {
      userIndex: 0,
      content: "Different content about software development",
      delay: 3000,
    },
    {
      userIndex: 1,
      content: "Testing is important in programming",
      delay: 4000,
    },
  ];
  for (const data of commentData) {
    // Add small delay to create different timestamps
    if (data.delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, data.delay));
    }
    const comment =
      await generate_random_discussion_board_user_articles_comments_create(
        userConnections[data.userIndex],
        {
          params: { articleId: article.id },
          body: { content: data.content },
        },
      );
    typia.assert(comment);
    comments.push(comment);
  }
  // Test 1: Search by content keywords
  const searchResult1 =
    await api.functional.discussionBoard.articles.comments.index(
      { host: connection.host },
      {
        articleId: article.id,
        body: { search: "programming" },
      },
    );
  typia.assert(searchResult1);
  TestValidator.equals(
    "search by programming keyword should return matching comments",
    searchResult1.data.length > 0,
    true,
  );
  // Test 2: Search by different keyword
  const searchResult2 =
    await api.functional.discussionBoard.articles.comments.index(
      { host: connection.host },
      {
        articleId: article.id,
        body: { search: "testing" },
      },
    );
  typia.assert(searchResult2);
  TestValidator.equals(
    "search by testing keyword should return matching comments",
    searchResult2.data.length > 0,
    true,
  );
  // Test 3: Filter by author display name
  const authorResult =
    await api.functional.discussionBoard.articles.comments.index(
      { host: connection.host },
      {
        articleId: article.id,
        body: { author_display_name: "TestUser0 DisplayName0" },
      },
    );
  typia.assert(authorResult);
  TestValidator.equals(
    "filter by author should return only their comments",
    authorResult.data.length,
    2,
  );
  // Test 4: Filter by non-existent author
  const noAuthorResult =
    await api.functional.discussionBoard.articles.comments.index(
      { host: connection.host },
      {
        articleId: article.id,
        body: { author_display_name: "NonExistentUser" },
      },
    );
  typia.assert(noAuthorResult);
  TestValidator.equals(
    "filter by non-existent author should return empty",
    noAuthorResult.data.length,
    0,
  );
  // Test 5: Date range filtering using created_at
  const startTime = new Date(Date.now() - 5000).toISOString();
  const endTime = new Date(Date.now() + 1000).toISOString();
  const dateRangeResult =
    await api.functional.discussionBoard.articles.comments.index(
      { host: connection.host },
      {
        articleId: article.id,
        body: {
          created_at_start: startTime,
          created_at_end: endTime,
        },
      },
    );
  typia.assert(dateRangeResult);
  TestValidator.equals(
    "date range filter should return all comments",
    dateRangeResult.data.length,
    comments.length,
  );
  // Test 6: Combined filtering - search + author
  const combinedResult =
    await api.functional.discussionBoard.articles.comments.index(
      { host: connection.host },
      {
        articleId: article.id,
        body: {
          search: "programming",
          author_display_name: "TestUser0 DisplayName0",
        },
      },
    );
  typia.assert(combinedResult);
  TestValidator.predicate(
    "combined filter should return comments matching both criteria",
    combinedResult.data.length > 0,
  );
  // Test 7: Search with no matching results
  const noMatchResult =
    await api.functional.discussionBoard.articles.comments.index(
      { host: connection.host },
      {
        articleId: article.id,
        body: { search: "nonexistentkeyword12345" },
      },
    );
  typia.assert(noMatchResult);
  TestValidator.equals(
    "search with nonexistent keyword should return empty",
    noMatchResult.data.length,
    0,
  );
  // Test 8: Pagination test
  const paginationResult =
    await api.functional.discussionBoard.articles.comments.index(
      { host: connection.host },
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 2,
        },
      },
    );
  typia.assert(paginationResult);
  TestValidator.equals(
    "pagination should respect limit",
    paginationResult.data.length,
    2,
  );
  TestValidator.predicate(
    "pagination metadata should be correct",
    paginationResult.pagination.records === comments.length &&
      paginationResult.pagination.current === 1 &&
      paginationResult.pagination.limit === 2,
  );
}
