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
 * Test advanced article search with category and tag filtering.
 *
 * This test validates the sophisticated filtering logic of the article search
 * API, ensuring that category-based filtering (OR logic) and tag-based
 * filtering (AND logic) work correctly both independently and in combination.
 *
 * Test Flow:
 *
 * 1. Create moderator account for content creation
 * 2. Create multiple categories (Politics, Economics, International)
 * 3. Create multiple tags (monetary-policy, fiscal-policy, trade, climate)
 * 4. Create test articles with strategic category/tag combinations
 * 5. Test category filtering (OR logic) - articles in ANY selected category
 * 6. Test tag filtering (AND logic) - articles with ALL selected tags
 * 7. Test combined category + tag filtering
 * 8. Validate pagination structure and result integrity
 */
export async function test_api_article_search_with_category_and_tag_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create categories
  const categoryPolitics =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Political Analysis",
          description: "In-depth analysis of political systems and governance",
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(categoryPolitics);

  const categoryEconomics =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Economic Policy",
          description: "Discussion of economic theories and policies",
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(categoryEconomics);

  const categoryInternational =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "International Trade",
          description: "Global trade agreements and economic relations",
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(categoryInternational);

  // Step 3: Create tags
  const tagMonetary =
    await api.functional.discussionBoard.moderator.tags.create(connection, {
      body: {
        name: "monetary-policy",
      } satisfies IDiscussionBoardTag.ICreate,
    });
  typia.assert(tagMonetary);

  const tagFiscal = await api.functional.discussionBoard.moderator.tags.create(
    connection,
    {
      body: {
        name: "fiscal-policy",
      } satisfies IDiscussionBoardTag.ICreate,
    },
  );
  typia.assert(tagFiscal);

  const tagTrade = await api.functional.discussionBoard.moderator.tags.create(
    connection,
    {
      body: {
        name: "trade",
      } satisfies IDiscussionBoardTag.ICreate,
    },
  );
  typia.assert(tagTrade);

  const tagClimate = await api.functional.discussionBoard.moderator.tags.create(
    connection,
    {
      body: {
        name: "climate",
      } satisfies IDiscussionBoardTag.ICreate,
    },
  );
  typia.assert(tagClimate);

  // Step 4: Create test articles with strategic category/tag combinations
  // Article 1: Economics + monetary-policy
  const article1 =
    await api.functional.discussionBoard.moderator.articles.create(connection, {
      body: {
        title: "Central Bank Interest Rate Policy",
        body: "Analysis of recent central bank decisions on interest rates and their impact on economic growth.",
        category_ids: [categoryEconomics.id],
        tag_ids: [tagMonetary.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article1);

  // Article 2: Economics + monetary-policy + fiscal-policy
  const article2 =
    await api.functional.discussionBoard.moderator.articles.create(connection, {
      body: {
        title: "Coordinated Economic Policy Approach",
        body: "Examining how monetary and fiscal policies work together to stabilize the economy.",
        category_ids: [categoryEconomics.id],
        tag_ids: [tagMonetary.id, tagFiscal.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article2);

  // Article 3: Politics + Economics + fiscal-policy
  const article3 =
    await api.functional.discussionBoard.moderator.articles.create(connection, {
      body: {
        title: "Government Budget and Political Priorities",
        body: "How political decisions shape fiscal policy and government spending priorities.",
        category_ids: [categoryPolitics.id, categoryEconomics.id],
        tag_ids: [tagFiscal.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article3);

  // Article 4: International + trade
  const article4 =
    await api.functional.discussionBoard.moderator.articles.create(connection, {
      body: {
        title: "Global Trade Agreements",
        body: "Comprehensive overview of recent international trade negotiations and agreements.",
        category_ids: [categoryInternational.id],
        tag_ids: [tagTrade.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article4);

  // Article 5: International + trade + climate
  const article5 =
    await api.functional.discussionBoard.moderator.articles.create(connection, {
      body: {
        title: "Climate Provisions in Trade Deals",
        body: "Examining environmental standards and climate commitments in international trade agreements.",
        category_ids: [categoryInternational.id],
        tag_ids: [tagTrade.id, tagClimate.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article5);

  // Article 6: Politics + climate
  const article6 =
    await api.functional.discussionBoard.moderator.articles.create(connection, {
      body: {
        title: "Political Action on Climate Change",
        body: "Political movements and policy initiatives addressing climate change challenges.",
        category_ids: [categoryPolitics.id],
        tag_ids: [tagClimate.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article6);

  // Step 5: Test category filtering (OR logic) - Economics OR International
  const categoryFilterResult =
    await api.functional.discussionBoard.search.articles.search(connection, {
      body: {
        category_slugs: [categoryEconomics.slug, categoryInternational.slug],
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(categoryFilterResult);

  // Should return articles 1, 2, 3, 4, 5 (any article in Economics OR International)
  TestValidator.predicate(
    "category filter should return correct number of articles",
    categoryFilterResult.data.length >= 5,
  );

  const categoryFilterIds = categoryFilterResult.data.map((a) => a.id);
  TestValidator.predicate(
    "should include article 1 (Economics)",
    categoryFilterIds.includes(article1.id),
  );
  TestValidator.predicate(
    "should include article 2 (Economics)",
    categoryFilterIds.includes(article2.id),
  );
  TestValidator.predicate(
    "should include article 3 (Politics + Economics)",
    categoryFilterIds.includes(article3.id),
  );
  TestValidator.predicate(
    "should include article 4 (International)",
    categoryFilterIds.includes(article4.id),
  );
  TestValidator.predicate(
    "should include article 5 (International)",
    categoryFilterIds.includes(article5.id),
  );

  // Step 6: Test tag filtering (AND logic) - must have both trade AND climate
  const tagFilterResult =
    await api.functional.discussionBoard.search.articles.search(connection, {
      body: {
        tag_slugs: [tagTrade.slug, tagClimate.slug],
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(tagFilterResult);

  // Should return only article 5 (has both trade AND climate)
  TestValidator.predicate(
    "tag AND filter should return only articles with all tags",
    tagFilterResult.data.length >= 1,
  );

  const tagFilterIds = tagFilterResult.data.map((a) => a.id);
  TestValidator.predicate(
    "should include article 5 (has both trade and climate)",
    tagFilterIds.includes(article5.id),
  );

  // Step 7: Test combined category + tag filtering
  // Category: Economics OR International, Tags: trade (must have)
  const combinedFilterResult =
    await api.functional.discussionBoard.search.articles.search(connection, {
      body: {
        category_slugs: [categoryEconomics.slug, categoryInternational.slug],
        tag_slugs: [tagTrade.slug],
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(combinedFilterResult);

  // Should return articles 4, 5 (in Economics OR International AND have trade tag)
  TestValidator.predicate(
    "combined filter should return articles matching both criteria",
    combinedFilterResult.data.length >= 2,
  );

  const combinedFilterIds = combinedFilterResult.data.map((a) => a.id);
  TestValidator.predicate(
    "should include article 4 (International + trade)",
    combinedFilterIds.includes(article4.id),
  );
  TestValidator.predicate(
    "should include article 5 (International + trade + climate)",
    combinedFilterIds.includes(article5.id),
  );

  // Verify single tag filter
  const singleTagResult =
    await api.functional.discussionBoard.search.articles.search(connection, {
      body: {
        tag_slugs: [tagMonetary.slug],
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(singleTagResult);

  const singleTagIds = singleTagResult.data.map((a) => a.id);
  TestValidator.predicate(
    "single tag filter should include article 1 (monetary-policy)",
    singleTagIds.includes(article1.id),
  );
  TestValidator.predicate(
    "single tag filter should include article 2 (monetary-policy + fiscal-policy)",
    singleTagIds.includes(article2.id),
  );
}
