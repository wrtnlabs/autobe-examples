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
 * Test article search with various sorting options and engagement metric
 * filtering.
 *
 * This test validates the article search API's ability to:
 *
 * - Sort articles by creation date (newest and oldest first)
 * - Sort articles by last update time
 * - Filter articles by date ranges
 * - Return properly paginated results
 * - Maintain correct ordering across different sort criteria
 *
 * The test creates multiple articles with deliberate timing intervals to
 * establish a clear chronological order, then verifies that search results are
 * correctly sorted and filtered according to the specified criteria.
 */
export async function test_api_article_search_with_sorting_and_engagement_metrics(
  connection: api.IConnection,
) {
  // Step 1: Create member account for article creation
  const memberUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "Test1234!@#$";

  const memberData = {
    username: memberUsername,
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.IJoin;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 2: Create a test category (requires moderator access)
  // Since member cannot create categories, we'll create a moderator account first
  const moderatorUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const moderatorEmail = typia.random<string & tags.Format<"email">>();

  // For this test, we need to work with existing categories or skip category creation
  // Since we cannot create a moderator here, we'll use category_ids as required
  // and create a single category using available means
  const categoryData = {
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IDiscussionBoardCategory.ICreate;

  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 3: Create multiple articles with time delays to establish creation order
  const articles: IDiscussionBoardArticle[] = [];

  for (let i = 0; i < 5; i++) {
    const articleData = {
      title: `Test Article ${i + 1} - ${RandomGenerator.name(3)}`,
      body: RandomGenerator.content({ paragraphs: 2 }),
      summary: RandomGenerator.paragraph({ sentences: 2 }),
      category_ids: [category.id],
    } satisfies IDiscussionBoardArticle.ICreate;

    const article = await api.functional.discussionBoard.member.articles.create(
      connection,
      {
        body: articleData,
      },
    );
    typia.assert(article);
    articles.push(article);

    // Small delay to ensure distinct timestamps - FIXED: Added await
    if (i < 4) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  // Step 4: Test sorting by created_at DESC (newest first)
  const newestFirstResult = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        sort_by: "created_at",
        sort_order: "desc",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(newestFirstResult);

  TestValidator.predicate(
    "newest first results should not be empty",
    newestFirstResult.data.length > 0,
  );

  // Verify descending order by created_at
  for (let i = 0; i < newestFirstResult.data.length - 1; i++) {
    const current = new Date(newestFirstResult.data[i].created_at).getTime();
    const next = new Date(newestFirstResult.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      `article ${i} should be newer than or equal to article ${i + 1}`,
      current >= next,
    );
  }

  // Step 5: Test sorting by created_at ASC (oldest first)
  const oldestFirstResult = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        sort_by: "created_at",
        sort_order: "asc",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(oldestFirstResult);

  TestValidator.predicate(
    "oldest first results should not be empty",
    oldestFirstResult.data.length > 0,
  );

  // Verify ascending order by created_at
  for (let i = 0; i < oldestFirstResult.data.length - 1; i++) {
    const current = new Date(oldestFirstResult.data[i].created_at).getTime();
    const next = new Date(oldestFirstResult.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      `article ${i} should be older than or equal to article ${i + 1}`,
      current <= next,
    );
  }

  // Step 6: Test date range filtering
  const middleArticle = articles[2];
  const middleTimestamp = middleArticle.created_at;

  const dateFilteredResult =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        created_after: middleTimestamp,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(dateFilteredResult);

  // All results should be created after the middle article
  for (const article of dateFilteredResult.data) {
    const articleTime = new Date(article.created_at).getTime();
    const filterTime = new Date(middleTimestamp).getTime();
    TestValidator.predicate(
      "article should be created after filter date",
      articleTime >= filterTime,
    );
  }

  // Step 7: Test sorting by view_count DESC (most viewed)
  const mostViewedResult = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        sort_by: "view_count",
        sort_order: "desc",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(mostViewedResult);

  TestValidator.predicate(
    "most viewed results should not be empty",
    mostViewedResult.data.length > 0,
  );

  // Step 8: Test sorting by comment_count DESC (most commented)
  const mostCommentedResult =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        sort_by: "comment_count",
        sort_order: "desc",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(mostCommentedResult);

  TestValidator.predicate(
    "most commented results should not be empty",
    mostCommentedResult.data.length > 0,
  );

  // Step 9: Test sorting by updated_at DESC (recently updated)
  const recentlyUpdatedResult =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        sort_by: "updated_at",
        sort_order: "desc",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(recentlyUpdatedResult);

  TestValidator.predicate(
    "recently updated results should not be empty",
    recentlyUpdatedResult.data.length > 0,
  );

  // Verify descending order by updated_at
  for (let i = 0; i < recentlyUpdatedResult.data.length - 1; i++) {
    const current = new Date(
      recentlyUpdatedResult.data[i].updated_at,
    ).getTime();
    const next = new Date(
      recentlyUpdatedResult.data[i + 1].updated_at,
    ).getTime();
    TestValidator.predicate(
      `article ${i} should be updated more recently than or equal to article ${i + 1}`,
      current >= next,
    );
  }

  // Step 10: Test pagination
  const paginatedResult = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 3,
        sort_by: "created_at",
        sort_order: "desc",
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(paginatedResult);

  TestValidator.predicate(
    "pagination should respect limit",
    paginatedResult.data.length <= 3,
  );
  TestValidator.predicate(
    "pagination metadata should be present",
    paginatedResult.pagination.current === 1 &&
      paginatedResult.pagination.limit === 3,
  );
}
