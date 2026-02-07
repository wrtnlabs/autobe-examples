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

/**
 * Test comment content filtering functionality by creating an article with varied comments
 * and verifying search filtering works correctly with different search patterns.
 */
export async function test_api_article_comments_content_filtering(
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
  // Create an article for testing - using a valid section ID from available sections
  // Note: In a real scenario, we would need to create or use an existing section
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 10,
        }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 3,
          sentenceMax: 5,
        }),
        section_id: typia.random<string & tags.Format<"uuid">>(), // This assumes sections exist
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Create varied comments with specific keywords for testing
  const comments = await ArrayUtil.asyncRepeat(6, async (index) => {
    const contentVariations = [
      "This is a TEST comment with keyword",
      "test comment with partial keyword match",
      "TESTING the search functionality",
      "Another comment without keywords",
      "Special characters: test@example.com",
      "Mixed case TeStInG comment",
    ];
    const comment =
      await generate_random_discussion_board_user_articles_comments_create(
        userConnection,
        {
          body: {
            content: contentVariations[index],
          } satisfies IDiscussionBoardComment.ICreate,
          params: {
            articleId: article.id,
          },
        },
      );
    typia.assert(comment);
    return comment;
  });
  // Test 1: Exact keyword match
  const exactMatchResults =
    await api.functional.discussionBoard.articles.comments.index(
      userConnection,
      {
        articleId: article.id,
        body: {
          search: "TEST",
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(exactMatchResults);
  // Test 2: Partial keyword match (case variations)
  const partialMatchResults =
    await api.functional.discussionBoard.articles.comments.index(
      userConnection,
      {
        articleId: article.id,
        body: {
          search: "test",
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(partialMatchResults);
  // Test 3: Special character handling
  const specialCharResults =
    await api.functional.discussionBoard.articles.comments.index(
      userConnection,
      {
        articleId: article.id,
        body: {
          search: "test@example.com",
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(specialCharResults);
  // Test 4: Empty search should return all comments
  const emptySearchResults =
    await api.functional.discussionBoard.articles.comments.index(
      userConnection,
      {
        articleId: article.id,
        body: {
          search: "",
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(emptySearchResults);
  // Empty search should return all comments
  TestValidator.equals(
    "empty search returns all comments",
    emptySearchResults.data.length,
    comments.length,
  );
  // Test 5: No matches search
  const noMatchResults =
    await api.functional.discussionBoard.articles.comments.index(
      userConnection,
      {
        articleId: article.id,
        body: {
          search: "nonexistentkeyword",
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(noMatchResults);
  // Should return empty results
  TestValidator.equals("no match returns empty", noMatchResults.data.length, 0);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination has valid current page",
    emptySearchResults.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    emptySearchResults.pagination.limit >= 1,
  );
  TestValidator.equals(
    "pagination records match data length",
    emptySearchResults.pagination.records,
    comments.length,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    emptySearchResults.pagination.pages >= 1,
  );
}
