import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Test filtering articles by popularity using min_view_count parameter to
 * surface trending discussions.
 *
 * This test validates the engagement-based content discovery feature that
 * enables users to identify popular and trending discussions by filtering
 * articles based on minimum view count thresholds.
 *
 * Test Process:
 *
 * 1. Create moderator account and establish article category
 * 2. Create member account to author test articles
 * 3. Create multiple published articles with varying engagement levels
 * 4. Search articles without view count filter to establish baseline
 * 5. Search with min_view_count parameter to test popularity filtering
 * 6. Verify articles can be sorted by view_count to show most popular first
 * 7. Validate that only articles meeting the view threshold are returned
 * 8. Confirm proper pagination and article summary structure
 */
export async function test_api_article_search_popularity_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for category management
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: typia.random<string & tags.Format<"password">>(),
        username: RandomGenerator.alphaNumeric(10),
        display_name: RandomGenerator.name(2),
        ip: "127.0.0.1",
        href: "https://test.example.com/moderator/join",
        referrer: "https://test.example.com/home",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create article category for organizing test articles
  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Economic Discussion",
          slug: "economic-discussion",
          description: "Discussions about economic policies and market trends",
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account to author articles
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: typia.random<string & tags.Format<"password">>(),
        username: RandomGenerator.alphaNumeric(10),
        display_name: RandomGenerator.name(2),
        bio: RandomGenerator.paragraph({ sentences: 5 }),
        ip: "127.0.0.1",
        href: "https://test.example.com/member/join",
        referrer: "https://test.example.com/home",
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create multiple published articles for popularity testing
  const articleCount = 5;
  const articles: IDiscussionBoardArticle[] = await ArrayUtil.asyncRepeat(
    articleCount,
    async (index) => {
      const article: IDiscussionBoardArticle =
        await api.functional.discussionBoard.member.articles.create(
          connection,
          {
            body: {
              title: `Article ${index + 1}: ${RandomGenerator.paragraph({ sentences: 3 })}`,
              body: RandomGenerator.content({
                paragraphs: 3,
                sentenceMin: 10,
                sentenceMax: 20,
              }),
              discussion_board_article_category_id: category.id,
              status: "published",
            } satisfies IDiscussionBoardArticle.ICreate,
          },
        );
      typia.assert(article);
      return article;
    },
  );

  // Step 5: Search articles without view count filter (baseline)
  const baselineSearch: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        page: 1,
        limit: 20,
        status: "published",
        discussion_board_article_category_id: category.id,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(baselineSearch);

  TestValidator.equals(
    "baseline search returns all created articles",
    baselineSearch.data.length,
    articleCount,
  );

  // Step 6: Search with min_view_count filter set to 0 (should return all articles)
  const zeroViewFilter: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        page: 1,
        limit: 20,
        status: "published",
        discussion_board_article_category_id: category.id,
        min_view_count: 0,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(zeroViewFilter);

  TestValidator.equals(
    "min_view_count of 0 returns all articles",
    zeroViewFilter.data.length,
    articleCount,
  );

  // Step 7: Verify all articles have view_count field and it's non-negative
  await ArrayUtil.asyncForEach(zeroViewFilter.data, async (article) => {
    TestValidator.predicate(
      "article has non-negative view_count",
      article.view_count >= 0,
    );
  });

  // Step 8: Search with sorting by view_count descending
  const sortedByViews: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        page: 1,
        limit: 20,
        status: "published",
        discussion_board_article_category_id: category.id,
        sort_by: "view_count",
        sort_order: "desc",
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(sortedByViews);

  TestValidator.equals(
    "sorted search returns all articles",
    sortedByViews.data.length,
    articleCount,
  );

  // Step 9: Verify descending sort order by view_count
  for (let i = 0; i < sortedByViews.data.length - 1; i++) {
    TestValidator.predicate(
      `article ${i} view_count >= article ${i + 1} view_count`,
      sortedByViews.data[i].view_count >= sortedByViews.data[i + 1].view_count,
    );
  }

  // Step 10: Test filtering with higher min_view_count threshold
  const highThreshold = 1000;
  const highViewFilter: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        page: 1,
        limit: 20,
        status: "published",
        discussion_board_article_category_id: category.id,
        min_view_count: highThreshold,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(highViewFilter);

  // Verify all returned articles meet the minimum view count threshold
  await ArrayUtil.asyncForEach(highViewFilter.data, async (article) => {
    TestValidator.predicate(
      `article view_count >= ${highThreshold}`,
      article.view_count >= highThreshold,
    );
  });

  // Step 11: Verify pagination structure
  TestValidator.predicate(
    "pagination current page is valid",
    baselineSearch.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit matches request",
    baselineSearch.pagination.limit === 20,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    baselineSearch.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is valid",
    baselineSearch.pagination.pages >= 0,
  );

  // Step 12: Validate article summary structure - business logic validation
  const sampleArticle = baselineSearch.data[0];
  typia.assert(sampleArticle);
  TestValidator.predicate(
    "article has category reference",
    sampleArticle.discussion_board_article_category_id === category.id,
  );
  TestValidator.predicate(
    "article has author reference",
    sampleArticle.discussion_board_member_id === member.id,
  );
  TestValidator.equals(
    "article status is published",
    sampleArticle.status,
    "published",
  );
}
