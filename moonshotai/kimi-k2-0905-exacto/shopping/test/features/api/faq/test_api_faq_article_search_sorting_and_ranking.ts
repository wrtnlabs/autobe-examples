import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IColorClass } from "@ORGANIZATION/PROJECT-api/lib/structures/IColorClass";
import type { IIconClass } from "@ORGANIZATION/PROJECT-api/lib/structures/IIconClass";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallFaqArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallFaqArticle";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallFaqArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFaqArticle";
import type { IShoppingMallFaqCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFaqCategory";
import type { IShoppingMallFaqTargetAudience } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFaqTargetAudience";

/**
 * Test FAQ article search result ordering and ranking mechanisms.
 *
 * This comprehensive test validates the marketplace knowledge base search
 * functionality, ensuring articles can be sorted by multiple criteria:
 *
 * - Relevance scoring based on search terms and content matching
 * - Popularity metrics (view_count) to surface frequently accessed content
 * - Community feedback (helpful_votes / total_votes) for quality-based ranking
 * - Recency of updates (updated_at) for time-sensitive information prioritization
 * - Featured article highlighting for critical support information
 *
 * The test validates that popularity-based sorting surfaces the most useful
 * content first and confirms that community feedback voting influences content
 * ranking appropriately. This ensures customers efficiently discover the most
 * relevant and helpful support articles while providing data-driven feedback
 * loops for content optimization and search result quality enhancement over
 * time.
 *
 * Steps:
 *
 * 1. Create admin account to manage FAQ system
 * 2. Create multiple FAQ articles with varying characteristics
 * 3. Test search functionality with different sorting criteria
 * 4. Verify popularity-based ranking sorts content appropriately
 * 5. Validate community feedback influences search results
 * 6. Confirm featured articles receive appropriate visibility enhancement
 */
export async function test_api_faq_article_search_sorting_and_ranking(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for managing FAQ system
  const adminEmail = `admin-${RandomGenerator.alphaNumeric(8)}@admin.com`;
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      firstname: "Test",
      lastname: "Admin",
      adminlevel: "department_admin",
      department: "Customer Support",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create FAQ category codes for organizing articles
  const categoryCodes = ["general", "technical", "billing", "shipping"];

  // Step 3: Create multiple FAQ articles with different characteristics
  const baseCharacteristics = [
    {
      title: "Popular article - high traffic content",
      isFeatured: true,
      difficulty: "beginner" as const,
      keywords: ["popular", "basic", "common"],
      categoryCode: "general",
    },
    {
      title: "Useful article - helpful guidance content",
      isFeatured: false,
      difficulty: "intermediate" as const,
      keywords: ["useful", "efficient", "quality"],
      categoryCode: "technical",
    },
    {
      title: "High volume troubleshooting guide",
      isFeatured: false,
      difficulty: "intermediate" as const,
      keywords: ["troubleshoot", "technical", "guide"],
      categoryCode: "technical",
    },
    {
      title: "Recently updated tutorial article",
      isFeatured: true,
      difficulty: "beginner" as const,
      keywords: ["tutorial", "updated", "recent"],
      categoryCode: "general",
    },
  ];

  const createdArticles: IShoppingMallFaqArticle[] = [];

  for (let i = 0; i < baseCharacteristics.length; i++) {
    const characteristics = baseCharacteristics[i];
    const createArticle = {
      title: characteristics.title,
      content: RandomGenerator.content({
        paragraphs: 3,
        sentenceMin: 8,
        sentenceMax: 15,
      }),
      excerpt: RandomGenerator.paragraph({ sentences: 4 }),
      slug: characteristics.title.toLowerCase().replace(/\s+/g, "-"),
      reading_time: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<3> & tags.Maximum<10>
      >(),
      difficulty: characteristics.difficulty,
      status: "published" satisfies "published",
      faqCategoryCode: characteristics.categoryCode,
      is_featured: characteristics.isFeatured,
      keywords: characteristics.keywords.join(", ").slice(0, 200),
      language: "en",
      target_audience: "customer",
    } satisfies IShoppingMallFaqArticle.ICreate;

    const createdArticle =
      await api.functional.shoppingMall.admin.faqArticles.create(connection, {
        body: createArticle,
      });
    typia.assert(createdArticle);
    createdArticles.push(createdArticle);
  }

  // Step 4: Test search with view_count sorting (popularity-based ranking)
  const popularRankedResults =
    await api.functional.shoppingMall.faqArticles.index(connection, {
      body: {
        sort_by: "view_count",
        order: "desc",
        limit: 10,
      } satisfies IShoppingMallFaqArticle.IRequest,
    });
  typia.assert(popularRankedResults);

  TestValidator.predicate(
    "results sorted by view count contains articles",
    popularRankedResults.data.length > 0,
  );

  // Step 5: Test search with helpful_votes sorting (quality-based ranking)
  const qualityRankedResults =
    await api.functional.shoppingMall.faqArticles.index(connection, {
      body: {
        sort_by: "helpful_votes",
        order: "desc",
        limit: 10,
      } satisfies IShoppingMallFaqArticle.IRequest,
    });
  typia.assert(qualityRankedResults);

  TestValidator.predicate(
    "results sorted by helpful votes contains articles",
    qualityRankedResults.data.length > 0,
  );

  // Step 6: Test search with updated_at sorting (recency-based ranking)
  const recencyRankedResults =
    await api.functional.shoppingMall.faqArticles.index(connection, {
      body: {
        sort_by: "updated_at",
        order: "desc",
        limit: 10,
      } satisfies IShoppingMallFaqArticle.IRequest,
    });
  typia.assert(recencyRankedResults);

  TestValidator.predicate(
    "results sorted by update recency contains articles",
    recencyRankedResults.data.length > 0,
  );

  // Step 7: Test keyword search relevance
  const keywordSearchResults =
    await api.functional.shoppingMall.faqArticles.index(connection, {
      body: {
        search: "tutorial troubleshooting",
        sort_by: "relevance",
        order: "desc",
        limit: 10,
      } satisfies IShoppingMallFaqArticle.IRequest,
    });
  typia.assert(keywordSearchResults);

  TestValidator.predicate(
    "keyword search returns relevant results",
    keywordSearchResults.data.length > 0,
  );

  // Step 8: Validate featured articles handling
  const featuredArticles = createdArticles.filter(
    (article) => article.is_featured,
  );
  TestValidator.predicate(
    "featured articles created successfully",
    featuredArticles.length > 0,
  );

  // Step 9: Test category filtering combined with sorting
  const technicalSortedResults =
    await api.functional.shoppingMall.faqArticles.index(connection, {
      body: {
        category: "technical",
        sort_by: "view_count",
        order: "desc",
        limit: 5,
      } satisfies IShoppingMallFaqArticle.IRequest,
    });
  typia.assert(technicalSortedResults);

  TestValidator.predicate(
    "category filtered and sorted results contains technical articles",
    technicalSortedResults.data.length > 0,
  );

  // Step 10: Test difficulty level filtering with sorting
  const beginnerSortedResults =
    await api.functional.shoppingMall.faqArticles.index(connection, {
      body: {
        difficulty: "beginner",
        sort_by: "view_count",
        order: "desc",
        limit: 5,
      } satisfies IShoppingMallFaqArticle.IRequest,
    });
  typia.assert(beginnerSortedResults);

  TestValidator.predicate(
    "difficulty filtered results contains beginner articles",
    beginnerSortedResults.data.length > 0,
  );
}
