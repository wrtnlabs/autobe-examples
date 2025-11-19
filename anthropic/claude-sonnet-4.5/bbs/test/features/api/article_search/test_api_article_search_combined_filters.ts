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
 * Test complex article searches combining multiple filter criteria
 * simultaneously.
 *
 * This test validates advanced search capabilities by creating diverse articles
 * across categories with various content and publication dates, then performing
 * searches that combine category filtering, keyword search, date range
 * constraints, and status filters.
 *
 * Verification ensures all filter conditions are applied correctly with AND
 * logic, confirming results satisfy all criteria simultaneously for precise
 * content discovery.
 *
 * Steps:
 *
 * 1. Create moderator account and multiple article categories
 * 2. Create member account to author diverse articles
 * 3. Create varied published articles across categories with different dates and
 *    keywords
 * 4. Perform combined filter search (category + text + date range + status)
 * 5. Validate all results match ALL filter criteria simultaneously
 */
export async function test_api_article_search_combined_filters(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for category management
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "moderator1234",
      username: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(),
      ip: "127.0.0.1",
      href: "https://example.com/moderator/join",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create multiple article categories
  const economicCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Economic Discussion",
          slug: "economic-discussion",
          description: "Discussions about economic policies and markets",
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(economicCategory);

  const politicalCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Political Discussion",
          slug: "political-discussion",
          description: "Discussions about political systems and governance",
          sort_order: 2,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(politicalCategory);

  const generalCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "General Discussion",
          slug: "general-discussion",
          description: "General discussions on various topics",
          sort_order: 3,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(generalCategory);

  // Step 3: Create member account for article authoring
  const memberEmail = typia.random<string & tags.Format<"email">>();
  await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "member1234",
      username: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 5 }),
      ip: "127.0.0.1",
      href: "https://example.com/member/join",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardMember.ICreate,
  });

  // Step 4: Create diverse articles with specific characteristics
  const baseDate = new Date("2024-01-01T00:00:00Z");
  const searchKeyword = "blockchain";

  // Articles in Economic category with "blockchain" keyword - published at different dates
  const article1 = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: `Understanding ${searchKeyword} technology in modern economics`,
        body: `This article explores how ${searchKeyword} is transforming financial systems and economic structures. The decentralized nature of blockchain provides new opportunities for transparency and efficiency in economic transactions.`,
        discussion_board_article_category_id: economicCategory.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article1);

  const article2 = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: `${searchKeyword} and cryptocurrency markets analysis`,
        body: `An in-depth analysis of how ${searchKeyword} technology impacts cryptocurrency markets. This technology revolutionizes the way we think about digital currencies and financial markets.`,
        discussion_board_article_category_id: economicCategory.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article2);

  // Articles in Economic category WITHOUT the keyword - should not appear in filtered results
  const article3 = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: "Traditional banking systems and their evolution",
        body: "A comprehensive study of how traditional banking has evolved over the centuries. Modern banking practices continue to adapt to changing economic conditions and technological advances.",
        discussion_board_article_category_id: economicCategory.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article3);

  // Articles in Political category with keyword - should not appear (wrong category)
  const article4 = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: `Government regulation of ${searchKeyword} technology`,
        body: `Political perspectives on regulating ${searchKeyword} and distributed ledger technologies. Governments worldwide are developing frameworks to manage this emerging technology.`,
        discussion_board_article_category_id: politicalCategory.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article4);

  // Draft article in Economic category with keyword - should not appear (wrong status)
  const article5 = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: `Future of ${searchKeyword} in global economy`,
        body: `Draft analysis of ${searchKeyword} potential impact on global economic systems. This draft explores various scenarios and predictions for blockchain adoption.`,
        discussion_board_article_category_id: economicCategory.id,
        status: "draft",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article5);

  // Articles in General category
  const article6 = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: "General thoughts on technology trends",
        body: "Various technology trends including artificial intelligence, machine learning, and distributed systems are shaping our future in unprecedented ways.",
        discussion_board_article_category_id: generalCategory.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article6);

  // Step 5: Perform combined filter search
  // Search for: Economic category + "blockchain" keyword + published status
  const searchResults = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
        search: searchKeyword,
        discussion_board_article_category_id: economicCategory.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(searchResults);

  // Step 6: Validate combined filter results
  TestValidator.predicate(
    "search should return results",
    searchResults.data.length > 0,
  );

  TestValidator.predicate(
    "all results should be in Economic category",
    searchResults.data.every(
      (article) =>
        article.discussion_board_article_category_id === economicCategory.id,
    ),
  );

  TestValidator.predicate(
    "all results should contain the search keyword",
    searchResults.data.every((article) => {
      const titleMatch = article.title
        .toLowerCase()
        .includes(searchKeyword.toLowerCase());
      const excerptMatch =
        article.excerpt !== null && article.excerpt !== undefined
          ? article.excerpt.toLowerCase().includes(searchKeyword.toLowerCase())
          : false;
      return titleMatch || excerptMatch;
    }),
  );

  TestValidator.predicate(
    "all results should have published status",
    searchResults.data.every((article) => article.status === "published"),
  );

  TestValidator.predicate(
    "should find exactly 2 articles matching all criteria",
    searchResults.data.length === 2,
  );

  // Step 7: Test with date range filtering
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 1);

  const dateFilteredResults =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        page: 1,
        limit: 20,
        search: searchKeyword,
        discussion_board_article_category_id: economicCategory.id,
        status: "published",
        published_after: baseDate.toISOString(),
        published_before: futureDate.toISOString(),
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(dateFilteredResults);

  TestValidator.predicate(
    "date filtered results should match previous results",
    dateFilteredResults.data.length === searchResults.data.length,
  );

  // Step 8: Verify pagination information
  TestValidator.predicate(
    "pagination should have correct page number",
    searchResults.pagination.current === 1,
  );

  TestValidator.predicate(
    "pagination total records should match result count",
    searchResults.pagination.records >= searchResults.data.length,
  );
}
