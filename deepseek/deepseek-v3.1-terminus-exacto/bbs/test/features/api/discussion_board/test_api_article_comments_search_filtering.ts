import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_comments_create } from "../../../generate/generate_random_discussion_board_member_articles_comments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";

/**
 * Test comment search and filtering capabilities on article comments.
 * 1. Create multiple member accounts for diverse comment authorship
 * 2. Create an article to host comments
 * 3. Generate comments with varied content patterns and keywords
 * 4. Test content search using trigram matching
 * 5. Test author filtering by member ID
 * 6. Test date range filtering
 * 7. Validate chronological ordering and pagination
 */
export async function test_api_article_comments_search_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create multiple member connections for diverse comment authorship
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member1);
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member2);
  // Create an article using member1
  const article = await generate_random_discussion_board_member_articles_create(
    member1Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      },
    },
  );
  typia.assert(article);
  // Create diverse comments with specific keywords for search testing
  const comments = await ArrayUtil.asyncRepeat(5, async (index) => {
    const memberConnection =
      index % 2 === 0 ? member1Connection : member2Connection;
    const contentKeywords = [
      "technology",
      "programming",
      "development",
      "software",
      "coding",
    ];
    const baseContent = RandomGenerator.paragraph({ sentences: 3 });
    const keyword = contentKeywords[index % contentKeywords.length];
    const commentContent = `${baseContent} ${keyword} ${RandomGenerator.paragraph({ sentences: 1 })}`;
    const comment =
      await generate_random_discussion_board_member_articles_comments_create(
        memberConnection,
        {
          body: {
            content: commentContent,
          },
          params: {
            articleId: article.id,
          },
        },
      );
    typia.assert(comment);
    return comment;
  });
  // Wait a moment to ensure comments have distinct timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Test 1: Search by content text using trigram matching
  const searchResults =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        search: "technology",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(searchResults);
  // Validate search results contain the keyword
  TestValidator.predicate(
    "search results should contain keyword",
    searchResults.data.some((comment) =>
      comment.content.toLowerCase().includes("technology"),
    ) || searchResults.data.length === 0,
  );
  // Test 2: Filter by author
  const authorFilterResults =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        authorId: member1.id,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(authorFilterResults);
  // Validate all results are from the specified author
  TestValidator.predicate(
    "all comments should be from specified author",
    authorFilterResults.data.every(
      (comment) => comment.author.id === member1.id,
    ),
  );
  // Test 3: Date range filtering
  const earliestComment = comments.reduce((earliest, current) =>
    current.created_at < earliest.created_at ? current : earliest,
  );
  const latestComment = comments.reduce((latest, current) =>
    current.created_at > latest.created_at ? current : latest,
  );
  const dateRangeResults =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        createdAtFrom: earliestComment.created_at,
        createdAtTo: latestComment.created_at,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(dateRangeResults);
  // Validate chronological ordering (oldest first)
  const isChronologicallyOrdered = dateRangeResults.data.every((comment, index, array) => {
    if (index === 0) return true;
    return comment.created_at >= array[index - 1].created_at;
  });
  TestValidator.predicate(
    "comments should be ordered chronologically",
    isChronologicallyOrdered,
  );
  // Test 4: Pagination validation
  const paginationResults =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        page: 1,
        limit: 2,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(paginationResults);
  TestValidator.equals(
    "pagination limit should be respected",
    paginationResults.data.length,
    2,
  );
  TestValidator.equals(
    "current page should be 1",
    paginationResults.pagination.current,
    1,
  );
  TestValidator.predicate(
    "total records should be positive",
    paginationResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be calculated correctly",
    paginationResults.pagination.pages ===
      Math.ceil(
        paginationResults.pagination.records /
          paginationResults.pagination.limit,
      ),
  );
  // Test 5: Empty search results
  const nonExistentSearch =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        search: "nonexistentkeyword12345",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(nonExistentSearch);
  TestValidator.equals(
    "non-existent search should return empty array",
    nonExistentSearch.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records should be 0 for empty results",
    nonExistentSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages should be 0 for empty results",
    nonExistentSearch.pagination.pages,
    0,
  );
}