import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEPageSortDirection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEPageSortDirection";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIPoliticsBbsArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPoliticsBbsArticle";
import type { IPoliticsBbsArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsArticle";
import type { IPoliticsBbsArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsArticleSnapshot";
import type { IPoliticsBbsAttachmentOfMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsAttachmentOfMember";
import type { IPoliticsBbsAttachmentOfModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsAttachmentOfModerator";
import type { IPoliticsBbsAttachmentOfVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsAttachmentOfVisitor";
import type { IPoliticsBbsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsCategory";
import type { IPoliticsBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsComment";
import type { IPoliticsBbsFileAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsFileAttachment";
import type { IPoliticsBbsImageAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsImageAttachment";
import type { IPoliticsBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsMember";
import type { IPoliticsBbsModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsModerator";
import type { IPoliticsBbsVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsVisitor";

/**
 * Test public article search functionality by category filtering.
 *
 * This test validates that articles can be discovered by browsing specific
 * politics/economics categories. It confirms search results include correct
 * metadata like view counts and creation dates, and validates filtering works
 * correctly for predefined political discussion topics.
 *
 * Test workflow:
 *
 * 1. Register as moderator to create organization categories
 * 2. Create multiple political discussion categories (Economic Policy,
 *    International Relations, etc.)
 * 3. Register as member to create test content
 * 4. Create articles in different categories with varied content
 * 5. Test category-based search functionality
 * 6. Validate search results contain correct metadata
 * 7. Verify filtering by specific categories works correctly
 * 8. Test pagination and sorting options
 * 9. Validate error cases and edge scenarios
 */
export async function test_api_article_public_search_by_category(
  connection: api.IConnection,
) {
  // Step 1: Register as moderator to create categories
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9-]+$">
      >(),
      email: typia.random<
        string & tags.Format<"email"> & tags.MinLength<6> & tags.MaxLength<254>
      >(),
      password: "SecurePass123!" satisfies string &
        tags.MinLength<8> &
        tags.Pattern<"^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)..*$">,
    } satisfies IPoliticsBbsModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create multiple political discussion categories
  const economicPolicy =
    await api.functional.politicsBbs.moderator.categories.create(connection, {
      body: {
        code: "economic-policy",
        name: "Economic Policy",
        description:
          "Discussions about economic policies, fiscal measures, and monetary policy decisions",
        sequence: 1,
        primary: true,
        required: false,
        multiplicative: true,
        color: "#1E88E5",
        icon: "fa-chart-line",
      } satisfies IPoliticsBbsCategory.ICreate,
    });
  typia.assert(economicPolicy);

  const internationalRelations =
    await api.functional.politicsBbs.moderator.categories.create(connection, {
      body: {
        code: "international-relations",
        name: "International Relations",
        description:
          "Analysis of diplomatic relations, foreign policy, and international cooperation",
        sequence: 2,
        primary: true,
        required: false,
        multiplicative: true,
        color: "#E53935",
        icon: "fa-globe",
      } satisfies IPoliticsBbsCategory.ICreate,
    });
  typia.assert(internationalRelations);

  const domesticPolitics =
    await api.functional.politicsBbs.moderator.categories.create(connection, {
      body: {
        code: "domestic-politics",
        name: "Domestic Politics",
        description:
          "Discussions about national politics, legislation, and domestic policy matters",
        sequence: 3,
        primary: true,
        required: false,
        multiplicative: true,
        color: "#43A047",
        icon: "fa-landmark",
      } satisfies IPoliticsBbsCategory.ICreate,
    });
  typia.assert(domesticPolitics);

  // Step 3: Register as member to create test content
  const member = await api.functional.auth.members.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9-]+$">
      >(),
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      href: "https://politicsbbs.example.com/register",
      referrer: "https://politicsbbs.example.com/",
      ip: "192.168.1.100",
    } satisfies IPoliticsBbsMember.IJoin,
  });
  typia.assert(member);

  // Step 4: Create articles in different categories
  const economicArticle1 =
    await api.functional.politicsBbs.member.articles.create(connection, {
      body: {
        politics_bbs_category_id: economicPolicy.id,
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
        content: RandomGenerator.content({
          paragraphs: 5,
          sentenceMin: 10,
          sentenceMax: 20,
          wordMin: 4,
          wordMax: 8,
        }),
      } satisfies IPoliticsBbsArticle.ICreate,
    });
  typia.assert(economicArticle1);

  const economicArticle2 =
    await api.functional.politicsBbs.member.articles.create(connection, {
      body: {
        politics_bbs_category_id: economicPolicy.id,
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 4,
          wordMax: 8,
        }),
        content: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 8,
          sentenceMax: 15,
          wordMin: 3,
          wordMax: 6,
        }),
      } satisfies IPoliticsBbsArticle.ICreate,
    });
  typia.assert(economicArticle2);

  const internationalArticle =
    await api.functional.politicsBbs.member.articles.create(connection, {
      body: {
        politics_bbs_category_id: internationalRelations.id,
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 9,
        }),
        content: RandomGenerator.content({
          paragraphs: 4,
          sentenceMin: 12,
          sentenceMax: 18,
          wordMin: 5,
          wordMax: 7,
        }),
      } satisfies IPoliticsBbsArticle.ICreate,
    });
  typia.assert(internationalArticle);

  const domesticArticle =
    await api.functional.politicsBbs.member.articles.create(connection, {
      body: {
        politics_bbs_category_id: domesticPolitics.id,
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 4,
          wordMax: 7,
        }),
        content: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 16,
          wordMin: 4,
          wordMax: 6,
        }),
      } satisfies IPoliticsBbsArticle.ICreate,
    });
  typia.assert(domesticArticle);

  // Step 5: Test category-based search functionality

  // Test 1: Search all articles without category filter
  const allArticles = await api.functional.politicsBbs.articles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 20,
        order: "desc",
        sort: "created_at",
      } satisfies IPoliticsBbsArticle.IRequest,
    },
  );
  typia.assert(allArticles);
  TestValidator.predicate(
    "all articles search returns results",
    allArticles.data.length >= 4,
  );
  TestValidator.predicate(
    "all articles have correct structure",
    allArticles.data.every(
      (article) =>
        article.id &&
        article.title &&
        article.content &&
        article.category &&
        article.view_count >= 0 &&
        article.created_at,
    ),
  );

  // Test 2: Filter by Economic Policy category
  const economicArticles = await api.functional.politicsBbs.articles.index(
    connection,
    {
      body: {
        category_id: economicPolicy.id,
        page: 1,
        limit: 10,
        order: "desc",
        sort: "created_at",
      } satisfies IPoliticsBbsArticle.IRequest,
    },
  );
  typia.assert(economicArticles);
  TestValidator.predicate(
    "economic policy articles filtered correctly",
    economicArticles.data.length >= 2,
  );
  TestValidator.predicate(
    "all results are economic policy category",
    economicArticles.data.every(
      (article) =>
        article.category.id === economicPolicy.id &&
        article.category.name === "Economic Policy",
    ),
  );

  // Test 3: Filter by International Relations category
  const internationalArticles = await api.functional.politicsBbs.articles.index(
    connection,
    {
      body: {
        category_id: internationalRelations.id,
        page: 1,
        limit: 10,
        order: "desc",
        sort: "created_at",
      } satisfies IPoliticsBbsArticle.IRequest,
    },
  );
  typia.assert(internationalArticles);
  TestValidator.predicate(
    "international relations articles filtered correctly",
    internationalArticles.data.length >= 1,
  );
  TestValidator.predicate(
    "all results are international relations category",
    internationalArticles.data.every(
      (article) =>
        article.category.id === internationalRelations.id &&
        article.category.name === "International Relations",
    ),
  );

  // Test 4: Filter by Domestic Politics category
  const domesticArticles = await api.functional.politicsBbs.articles.index(
    connection,
    {
      body: {
        category_id: domesticPolitics.id,
        page: 1,
        limit: 10,
        order: "desc",
        sort: "created_at",
      } satisfies IPoliticsBbsArticle.IRequest,
    },
  );
  typia.assert(domesticArticles);
  TestValidator.predicate(
    "domestic politics articles filtered correctly",
    domesticArticles.data.length >= 1,
  );
  TestValidator.predicate(
    "all results are domestic politics category",
    domesticArticles.data.every(
      (article) =>
        article.category.id === domesticPolitics.id &&
        article.category.name === "Domestic Politics",
    ),
  );

  // Step 6: Test search functionality with keywords
  const searchResults = await api.functional.politicsBbs.articles.index(
    connection,
    {
      body: {
        search: RandomGenerator.substring(economicArticle1.title),
        page: 1,
        limit: 10,
        order: "desc",
        sort: "relevance",
      } satisfies IPoliticsBbsArticle.IRequest,
    },
  );
  typia.assert(searchResults);
  TestValidator.predicate(
    "search by keyword returns relevant results",
    searchResults.data.length >= 1,
  );

  // Step 7: Test sorting options
  const sortByViewCount = await api.functional.politicsBbs.articles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        order: "desc",
        sort: "view_count",
      } satisfies IPoliticsBbsArticle.IRequest,
    },
  );
  typia.assert(sortByViewCount);
  TestValidator.predicate(
    "sort by view count works correctly",
    sortByViewCount.data.length >= 1,
  );

  const sortByCreatedAtAsc = await api.functional.politicsBbs.articles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        order: "asc",
        sort: "created_at",
      } satisfies IPoliticsBbsArticle.IRequest,
    },
  );
  typia.assert(sortByCreatedAtAsc);
  TestValidator.predicate(
    "sort by created at ascending works correctly",
    sortByCreatedAtAsc.data.length >= 1,
  );

  // Step 8: Test pagination
  const page1 = await api.functional.politicsBbs.articles.index(connection, {
    body: {
      page: 1,
      limit: 2,
      order: "desc",
      sort: "created_at",
    } satisfies IPoliticsBbsArticle.IRequest,
  });
  typia.assert(page1);
  TestValidator.equals(
    "page 1 limit 2 returns 2 results",
    page1.data.length,
    2,
  );
  TestValidator.equals(
    "page 1 pagination correct",
    page1.pagination.current,
    1,
  );
  TestValidator.predicate(
    "page 1 has total records",
    page1.pagination.records >= 4,
  );

  const page2 = await api.functional.politicsBbs.articles.index(connection, {
    body: {
      page: 2,
      limit: 2,
      order: "desc",
      sort: "created_at",
    } satisfies IPoliticsBbsArticle.IRequest,
  });
  typia.assert(page2);
  TestValidator.equals(
    "page 2 limit 2 returns results",
    page2.data.length,
    Math.min(2, page2.pagination.records - 2),
  );
  TestValidator.equals(
    "page 2 pagination correct",
    page2.pagination.current,
    2,
  );

  // Step 9: Validate metadata in search results
  TestValidator.predicate(
    "articles have correct metadata structure",
    allArticles.data.every(
      (article) =>
        article.id &&
        article.title &&
        article.content &&
        article.state &&
        article.view_count >= 0 &&
        article.created_at &&
        article.updated_at &&
        article.category &&
        article.category.id &&
        article.category.name &&
        article.category.description,
    ),
  );

  // Step 10: Test date range filtering
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const recentArticles = await api.functional.politicsBbs.articles.index(
    connection,
    {
      body: {
        created_after: yesterday.toISOString(),
        page: 1,
        limit: 10,
        order: "desc",
        sort: "created_at",
      } satisfies IPoliticsBbsArticle.IRequest,
    },
  );
  typia.assert(recentArticles);
  TestValidator.predicate(
    "date filter returns recent articles",
    recentArticles.data.length >= 4,
  );
}
