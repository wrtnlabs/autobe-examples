import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDocument";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Test article search with date range and author filtering to help users find
 * content from specific time periods or by specific authors.
 *
 * This test validates the article search API's ability to filter results by
 * publication date ranges and author usernames. It creates articles by
 * different authors at different times, then verifies that date range filtering
 * correctly limits results to the specified time period, author filtering
 * returns only articles by the specified member, combining date and author
 * filters works correctly, and pagination and sorting work with these filters
 * applied.
 *
 * Test workflow:
 *
 * 1. Create moderator account as first author
 * 2. Create category required for article creation
 * 3. Create articles by moderator at various dates
 * 4. Create member account as second author
 * 5. Create articles by member at various dates
 * 6. Test date range filtering (after, before, range)
 * 7. Test author filtering by username
 * 8. Test combined date and author filters
 * 9. Validate pagination and result accuracy
 */
export async function test_api_article_search_with_date_range_and_author_filtering(
  connection: api.IConnection,
) {
  const ARTICLE_COUNT_PER_AUTHOR = 3;
  const TIMESTAMP_DELAY_MS = 1000;
  const PAGINATION_LIMIT = 2;

  // Step 1: Create moderator account as first author
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphaNumeric(10);
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: moderatorUsername,
        email: moderatorEmail,
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create category required for article creation
  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create articles by moderator at various dates
  const moderatorArticles: IDiscussionBoardArticle[] = [];

  for (let i = 0; i < ARTICLE_COUNT_PER_AUTHOR; i++) {
    const article: IDiscussionBoardArticle =
      await api.functional.discussionBoard.moderator.articles.create(
        connection,
        {
          body: {
            title: `Moderator Article ${i + 1}: ${RandomGenerator.paragraph({ sentences: 2 })}`,
            body: RandomGenerator.content({
              paragraphs: 3,
              sentenceMin: 10,
              sentenceMax: 20,
            }),
            category_ids: [category.id],
          } satisfies IDiscussionBoardArticle.ICreate,
        },
      );
    typia.assert(article);
    moderatorArticles.push(article);

    if (i < ARTICLE_COUNT_PER_AUTHOR - 1) {
      await new Promise((resolve) => setTimeout(resolve, TIMESTAMP_DELAY_MS));
    }
  }

  // Step 4: Create member account as second author
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(10);
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(member);

  // Step 5: Create articles by member at various dates
  const memberArticles: IDiscussionBoardArticle[] = [];

  for (let i = 0; i < ARTICLE_COUNT_PER_AUTHOR; i++) {
    const article: IDiscussionBoardArticle =
      await api.functional.discussionBoard.member.articles.create(connection, {
        body: {
          title: `Member Article ${i + 1}: ${RandomGenerator.paragraph({ sentences: 2 })}`,
          body: RandomGenerator.content({
            paragraphs: 3,
            sentenceMin: 10,
            sentenceMax: 20,
          }),
          category_ids: [category.id],
        } satisfies IDiscussionBoardArticle.ICreate,
      });
    typia.assert(article);
    memberArticles.push(article);

    if (i < ARTICLE_COUNT_PER_AUTHOR - 1) {
      await new Promise((resolve) => setTimeout(resolve, TIMESTAMP_DELAY_MS));
    }
  }

  // Add delay to ensure all articles are fully persisted
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Step 6: Test date range filtering
  const allArticles = [...moderatorArticles, ...memberArticles];
  TestValidator.predicate(
    "should have created all articles",
    allArticles.length === ARTICLE_COUNT_PER_AUTHOR * 2,
  );

  const middleIndex = Math.floor(allArticles.length / 2);
  const middleTimestamp = allArticles[middleIndex].created_at;

  // Test created_after filtering
  const afterResults: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.search.articles.search(connection, {
      body: {
        created_after: middleTimestamp,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(afterResults);

  TestValidator.predicate(
    "articles after timestamp should have correct count",
    afterResults.data.length >= 2,
  );

  for (const article of afterResults.data) {
    TestValidator.predicate(
      "article created_at should be after filter timestamp",
      new Date(article.created_at) >= new Date(middleTimestamp),
    );
    TestValidator.equals(
      "article status should be published",
      article.status,
      "published",
    );
  }

  // Test created_before filtering
  const beforeResults: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.search.articles.search(connection, {
      body: {
        created_before: middleTimestamp,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(beforeResults);

  for (const article of beforeResults.data) {
    TestValidator.predicate(
      "article created_at should be before filter timestamp",
      new Date(article.created_at) <= new Date(middleTimestamp),
    );
    TestValidator.equals(
      "article status should be published",
      article.status,
      "published",
    );
  }

  // Test date range filtering (both after and before)
  const firstTimestamp = allArticles[1].created_at;
  const lastTimestamp = allArticles[allArticles.length - 2].created_at;

  const rangeResults: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.search.articles.search(connection, {
      body: {
        created_after: firstTimestamp,
        created_before: lastTimestamp,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(rangeResults);

  for (const article of rangeResults.data) {
    const createdAt = new Date(article.created_at);
    TestValidator.predicate(
      "article should be within date range",
      createdAt >= new Date(firstTimestamp) &&
        createdAt <= new Date(lastTimestamp),
    );
  }

  // Step 7: Test author filtering by username
  const moderatorFilterResults: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.search.articles.search(connection, {
      body: {
        author_username: moderatorUsername,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(moderatorFilterResults);

  TestValidator.equals(
    "moderator articles should match created count",
    moderatorFilterResults.data.length,
    moderatorArticles.length,
  );

  for (const article of moderatorFilterResults.data) {
    TestValidator.equals(
      "article author username should match filter",
      article.author.username,
      moderatorUsername,
    );
  }

  const memberFilterResults: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.search.articles.search(connection, {
      body: {
        author_username: memberUsername,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(memberFilterResults);

  TestValidator.equals(
    "member articles should match created count",
    memberFilterResults.data.length,
    memberArticles.length,
  );

  for (const article of memberFilterResults.data) {
    TestValidator.equals(
      "article author username should match filter",
      article.author.username,
      memberUsername,
    );
  }

  // Step 8: Test combined date and author filters
  const combinedResults: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.search.articles.search(connection, {
      body: {
        author_username: moderatorUsername,
        created_after: moderatorArticles[0].created_at,
        created_before:
          moderatorArticles[ARTICLE_COUNT_PER_AUTHOR - 1].created_at,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(combinedResults);

  for (const article of combinedResults.data) {
    TestValidator.equals(
      "combined filter: author should match",
      article.author.username,
      moderatorUsername,
    );

    const createdAt = new Date(article.created_at);
    TestValidator.predicate(
      "combined filter: date should be in range",
      createdAt >= new Date(moderatorArticles[0].created_at) &&
        createdAt <=
          new Date(moderatorArticles[ARTICLE_COUNT_PER_AUTHOR - 1].created_at),
    );
  }

  // Step 9: Validate pagination with filters
  const paginatedResults: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.search.articles.search(connection, {
      body: {
        page: 1,
        limit: PAGINATION_LIMIT,
        author_username: moderatorUsername,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(paginatedResults);

  TestValidator.predicate(
    "paginated results should respect limit",
    paginatedResults.data.length <= PAGINATION_LIMIT,
  );

  TestValidator.equals(
    "pagination current page should be 1",
    paginatedResults.pagination.current,
    1,
  );

  TestValidator.equals(
    "pagination limit should match request",
    paginatedResults.pagination.limit,
    PAGINATION_LIMIT,
  );

  TestValidator.equals(
    "pagination records should match total moderator articles",
    paginatedResults.pagination.records,
    moderatorArticles.length,
  );
}
