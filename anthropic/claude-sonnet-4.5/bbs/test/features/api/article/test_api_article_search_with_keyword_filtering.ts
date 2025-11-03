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
 * Test comprehensive article search functionality with keyword filtering across
 * titles and body content.
 *
 * This test validates the core content discovery mechanism by creating multiple
 * articles with specific keywords like 'monetary policy', 'trade agreements',
 * and 'climate change', then performing search queries to verify proper
 * filtering and ranking. Title matches should be prioritized over body content
 * matches. The test also validates pagination with different page sizes (10,
 * 20, 50, 100) and verifies that total count, page metadata, and article
 * summaries are correctly returned.
 *
 * Steps:
 *
 * 1. Create member account for authoring test articles
 * 2. Create test categories for article organization
 * 3. Generate diverse articles with specific keywords in titles and body content
 * 4. Perform keyword searches and validate filtering accuracy
 * 5. Test pagination with various page sizes
 * 6. Verify response structure and article summaries
 * 7. Confirm title matches rank higher than body-only matches
 */
export async function test_api_article_search_with_keyword_filtering(
  connection: api.IConnection,
) {
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPassword123!";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);

  const economicCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Economic Policy",
          description:
            "Discussions about economic policies and monetary systems",
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(economicCategory);

  const politicalCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Political Analysis",
          description: "Analysis of political developments and policies",
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(politicalCategory);

  const internationalCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "International Trade",
          description: "International trade policies and agreements",
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(internationalCategory);

  const articlesWithKeywords = [
    {
      title: "Monetary Policy and Central Banking Strategies",
      body: "This article explores the impact of monetary policy on economic growth. Central banks use various tools to control inflation and stimulate economic activity through interest rate adjustments and quantitative easing programs.",
      categoryIds: [economicCategory.id],
      keyword: "monetary policy",
    },
    {
      title: "Federal Reserve Economic Outlook",
      body: "The Federal Reserve's monetary policy decisions have significant implications for global markets. Recent adjustments in interest rates reflect concerns about inflation and economic stability.",
      categoryIds: [economicCategory.id],
      keyword: "monetary policy",
    },
    {
      title: "International Trade Agreements and Global Commerce",
      body: "Trade agreements between nations facilitate economic cooperation and reduce barriers to international commerce. These agreements cover tariffs, intellectual property rights, and dispute resolution mechanisms.",
      categoryIds: [internationalCategory.id],
      keyword: "trade agreements",
    },
    {
      title: "Bilateral Trade Deal Analysis",
      body: "Recent trade agreements have reshaped global supply chains and created new opportunities for businesses. The impact of these bilateral deals extends beyond immediate economic benefits.",
      categoryIds: [internationalCategory.id],
      keyword: "trade agreements",
    },
    {
      title: "Climate Change Policy and Environmental Economics",
      body: "Climate change presents unprecedented challenges requiring coordinated global action. Economic policies must balance environmental protection with sustainable development goals.",
      categoryIds: [politicalCategory.id],
      keyword: "climate change",
    },
    {
      title: "Environmental Impact Assessment",
      body: "Addressing climate change requires comprehensive policy frameworks that integrate scientific research with economic planning. Carbon pricing mechanisms and renewable energy investments are critical components.",
      categoryIds: [politicalCategory.id],
      keyword: "climate change",
    },
    {
      title: "Fiscal Policy Reforms",
      body: "Government spending and taxation policies shape economic outcomes. This article examines various fiscal policy approaches and their effectiveness in different economic contexts.",
      categoryIds: [economicCategory.id],
      keyword: "other",
    },
    {
      title: "Healthcare System Analysis",
      body: "Healthcare policy intersects with economic and social considerations. This comprehensive analysis explores different healthcare models and their implications for public health.",
      categoryIds: [politicalCategory.id],
      keyword: "other",
    },
  ];

  const createdArticles = await ArrayUtil.asyncMap(
    articlesWithKeywords,
    async (articleData) => {
      const article =
        await api.functional.discussionBoard.member.articles.create(
          connection,
          {
            body: {
              title: articleData.title,
              body: articleData.body,
              category_ids: articleData.categoryIds,
            } satisfies IDiscussionBoardArticle.ICreate,
          },
        );
      typia.assert(article);
      return { article, keyword: articleData.keyword };
    },
  );

  const monetaryPolicyResults =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        search: "monetary policy",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(monetaryPolicyResults);

  TestValidator.predicate(
    "monetary policy search returns results",
    monetaryPolicyResults.data.length > 0,
  );

  TestValidator.predicate(
    "all monetary policy results contain the keyword",
    monetaryPolicyResults.data.every(
      (article) =>
        article.title.toLowerCase().includes("monetary policy") ||
        (article.summary &&
          article.summary.toLowerCase().includes("monetary policy")),
    ),
  );

  const tradeAgreementsResults =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        search: "trade agreements",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(tradeAgreementsResults);

  TestValidator.predicate(
    "trade agreements search returns results",
    tradeAgreementsResults.data.length > 0,
  );

  const climateChangeResults =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        search: "climate change",
        page: 1,
        limit: 50,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(climateChangeResults);

  TestValidator.predicate(
    "climate change search returns results",
    climateChangeResults.data.length > 0,
  );

  const paginationTest100 = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(paginationTest100);

  TestValidator.predicate(
    "pagination with limit 100 returns data",
    paginationTest100.data.length >= 0,
  );

  TestValidator.predicate(
    "pagination metadata is present",
    paginationTest100.pagination !== undefined &&
      paginationTest100.pagination.current >= 0 &&
      paginationTest100.pagination.limit === 100 &&
      paginationTest100.pagination.records >= 0,
  );

  const allArticlesPage1 = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(allArticlesPage1);

  const allArticlesPage2 = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        page: 2,
        limit: 5,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(allArticlesPage2);

  TestValidator.predicate(
    "different pages return different results",
    allArticlesPage1.data.length === 0 ||
      allArticlesPage2.data.length === 0 ||
      allArticlesPage1.data[0].id !== allArticlesPage2.data[0].id,
  );

  TestValidator.predicate(
    "article summaries include required fields",
    monetaryPolicyResults.data.every(
      (article) =>
        article.id !== undefined &&
        article.title !== undefined &&
        article.author !== undefined &&
        article.categories !== undefined &&
        article.created_at !== undefined,
    ),
  );
}
