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
 * Test article search with category and tag-based filtering.
 *
 * This test validates the content organization and filtering system of the
 * discussion board by creating categories (Economic Policy, Political Analysis,
 * International Trade) and tags (monetary-policy, healthcare-reform,
 * climate-change), then creating articles with various combinations of these
 * classifications.
 *
 * The test verifies that:
 *
 * 1. Category filtering works with single and multiple categories (OR logic)
 * 2. Tag filtering works with single and multiple tags (AND logic)
 * 3. Combined category and tag filters produce accurate results
 * 4. The filtering system supports effective content discovery
 *
 * Test flow:
 *
 * 1. Register member account for article authoring
 * 2. Create three categories for topic classification
 * 3. Create three tags for granular topic labeling
 * 4. Create articles with different category and tag combinations
 * 5. Test single category filtering
 * 6. Test multiple category filtering (OR logic)
 * 7. Test single tag filtering
 * 8. Test multiple tag filtering (AND logic)
 * 9. Test combined category and tag filtering
 * 10. Validate search results match expected filtered subsets
 */
export async function test_api_article_search_with_category_and_tag_filtering(
  connection: api.IConnection,
) {
  // 1. Register member account for article authoring
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<30> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);

  // 2. Create three categories for topic classification
  const economicPolicyCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Economic Policy",
          description:
            "Articles discussing fiscal policy, monetary policy, taxation, and economic regulation",
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(economicPolicyCategory);

  const politicalAnalysisCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Political Analysis",
          description:
            "In-depth analysis of political systems, governance, and policy decisions",
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(politicalAnalysisCategory);

  const internationalTradeCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "International Trade",
          description:
            "Global trade agreements, tariffs, and international economic relations",
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(internationalTradeCategory);

  // 3. Create three tags for granular topic labeling
  const monetaryPolicyTag =
    await api.functional.discussionBoard.moderator.tags.create(connection, {
      body: {
        name: "monetary-policy",
      } satisfies IDiscussionBoardTag.ICreate,
    });
  typia.assert(monetaryPolicyTag);

  const healthcareReformTag =
    await api.functional.discussionBoard.moderator.tags.create(connection, {
      body: {
        name: "healthcare-reform",
      } satisfies IDiscussionBoardTag.ICreate,
    });
  typia.assert(healthcareReformTag);

  const climateChangeTag =
    await api.functional.discussionBoard.moderator.tags.create(connection, {
      body: {
        name: "climate-change",
      } satisfies IDiscussionBoardTag.ICreate,
    });
  typia.assert(climateChangeTag);

  // 4. Create articles with different category and tag combinations
  // Article 1: Economic Policy + monetary-policy tag
  const article1 = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: "Central Bank Interest Rate Policy Analysis",
        body: "Detailed analysis of how central banks use interest rates to control inflation and stimulate economic growth through monetary policy mechanisms.",
        category_ids: [economicPolicyCategory.id],
        tag_ids: [monetaryPolicyTag.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article1);

  // Article 2: Political Analysis + healthcare-reform tag
  const article2 = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: "Healthcare Reform Legislative Framework",
        body: "Comprehensive review of proposed healthcare reform legislation and its potential impact on public health systems and insurance markets.",
        category_ids: [politicalAnalysisCategory.id],
        tag_ids: [healthcareReformTag.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article2);

  // Article 3: Economic Policy + Political Analysis + climate-change tag
  const article3 = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: "Climate Change Economic and Political Implications",
        body: "Analysis of how climate change policies affect economic development and political decision-making processes globally.",
        category_ids: [economicPolicyCategory.id, politicalAnalysisCategory.id],
        tag_ids: [climateChangeTag.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article3);

  // Article 4: International Trade + monetary-policy + climate-change tags
  const article4 = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: "Green Trade Agreements and Monetary Policy Coordination",
        body: "Examination of how international trade agreements incorporate climate policy and coordinate monetary policy across nations.",
        category_ids: [internationalTradeCategory.id],
        tag_ids: [monetaryPolicyTag.id, climateChangeTag.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article4);

  // Article 5: Economic Policy + monetary-policy + healthcare-reform tags
  const article5 = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: "Monetary Policy Impact on Healthcare Funding",
        body: "Study of how central bank monetary policy decisions affect government healthcare spending and reform initiatives.",
        category_ids: [economicPolicyCategory.id],
        tag_ids: [monetaryPolicyTag.id, healthcareReformTag.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article5);

  // 5. Test single category filtering - Economic Policy
  const economicPolicyResults =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        category_slugs: [economicPolicyCategory.slug],
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(economicPolicyResults);

  const economicPolicyArticleIds = economicPolicyResults.data.map((a) => a.id);
  TestValidator.predicate(
    "Economic Policy category filter should return articles 1, 3, and 5",
    economicPolicyArticleIds.includes(article1.id) &&
      economicPolicyArticleIds.includes(article3.id) &&
      economicPolicyArticleIds.includes(article5.id) &&
      !economicPolicyArticleIds.includes(article2.id) &&
      !economicPolicyArticleIds.includes(article4.id),
  );

  // 6. Test multiple category filtering (OR logic) - Economic Policy OR Political Analysis
  const multiCategoryResults =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        category_slugs: [
          economicPolicyCategory.slug,
          politicalAnalysisCategory.slug,
        ],
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(multiCategoryResults);

  const multiCategoryArticleIds = multiCategoryResults.data.map((a) => a.id);
  TestValidator.predicate(
    "Multiple category filter (OR logic) should return articles 1, 2, 3, and 5",
    multiCategoryArticleIds.includes(article1.id) &&
      multiCategoryArticleIds.includes(article2.id) &&
      multiCategoryArticleIds.includes(article3.id) &&
      multiCategoryArticleIds.includes(article5.id) &&
      !multiCategoryArticleIds.includes(article4.id),
  );

  // 7. Test single tag filtering - monetary-policy tag
  const monetaryPolicyTagResults =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        tag_slugs: [monetaryPolicyTag.slug],
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(monetaryPolicyTagResults);

  const monetaryPolicyTagArticleIds = monetaryPolicyTagResults.data.map(
    (a) => a.id,
  );
  TestValidator.predicate(
    "Monetary policy tag filter should return articles 1, 4, and 5",
    monetaryPolicyTagArticleIds.includes(article1.id) &&
      monetaryPolicyTagArticleIds.includes(article4.id) &&
      monetaryPolicyTagArticleIds.includes(article5.id) &&
      !monetaryPolicyTagArticleIds.includes(article2.id) &&
      !monetaryPolicyTagArticleIds.includes(article3.id),
  );

  // 8. Test multiple tag filtering (AND logic) - monetary-policy AND climate-change tags
  const multiTagResults = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        tag_slugs: [monetaryPolicyTag.slug, climateChangeTag.slug],
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(multiTagResults);

  const multiTagArticleIds = multiTagResults.data.map((a) => a.id);
  TestValidator.predicate(
    "Multiple tag filter (AND logic) should return only article 4",
    multiTagArticleIds.includes(article4.id) &&
      !multiTagArticleIds.includes(article1.id) &&
      !multiTagArticleIds.includes(article2.id) &&
      !multiTagArticleIds.includes(article3.id) &&
      !multiTagArticleIds.includes(article5.id),
  );

  // 9. Test combined category and tag filtering - Economic Policy category AND monetary-policy tag
  const combinedFilterResults =
    await api.functional.discussionBoard.articles.index(connection, {
      body: {
        category_slugs: [economicPolicyCategory.slug],
        tag_slugs: [monetaryPolicyTag.slug],
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(combinedFilterResults);

  const combinedFilterArticleIds = combinedFilterResults.data.map((a) => a.id);
  TestValidator.predicate(
    "Combined filter (Economic Policy AND monetary-policy) should return articles 1 and 5",
    combinedFilterArticleIds.includes(article1.id) &&
      combinedFilterArticleIds.includes(article5.id) &&
      !combinedFilterArticleIds.includes(article2.id) &&
      !combinedFilterArticleIds.includes(article3.id) &&
      !combinedFilterArticleIds.includes(article4.id),
  );
}
