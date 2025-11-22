import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionArticle";
import type { IEconPoliticalDiscussionAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionAttachment";
import type { IEconPoliticalDiscussionRegisteredMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionRegisteredMember";
import type { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPoliticalDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalDiscussionArticle";

export async function test_api_user_articles_bulk_sorting_scenarios(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as registered member
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: IEconPoliticalDiscussionRegisteredMember.IAuthorized =
    await api.functional.auth.registeredMember.join(connection, {
      body: {
        display_name: "Article Sort Tester",
        email: memberEmail,
        status: "active",
      } satisfies IEconPoliticalDiscussionRegisteredMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create comprehensive dataset of articles for sorting tests
  const categories = [
    "Economic Policy",
    "Political Analysis",
    "Market Discussion",
    "Regulatory Updates",
    "International Relations",
  ] as const;

  const baseDate = new Date();
  const articles: IEconPoliticalDiscussionArticle[] = [];

  // Create 18 articles with deliberate characteristics for sorting tests
  const articleData = [
    // Early articles (older timestamps)
    { title: "Analyzing GDP Trends", category: "Economic Policy", daysAgo: 20 },
    {
      title: "Budget Deficit Analysis",
      category: "Economic Policy",
      daysAgo: 18,
    },
    { title: "Central Bank Policy", category: "Economic Policy", daysAgo: 15 },

    // Mid-range articles
    {
      title: "Election Campaign Impact",
      category: "Political Analysis",
      daysAgo: 12,
    },
    {
      title: "Healthcare Reform Discussion",
      category: "Political Analysis",
      daysAgo: 10,
    },
    {
      title: "Foreign Policy Changes",
      category: "Political Analysis",
      daysAgo: 8,
    },

    // Recent articles (newer timestamps)
    {
      title: "Zombie Stocks Analysis",
      category: "Market Discussion",
      daysAgo: 6,
    },
    {
      title: "Cryptocurrency Regulation",
      category: "Market Discussion",
      daysAgo: 5,
    },
    {
      title: "Tech Stock Performance",
      category: "Market Discussion",
      daysAgo: 3,
    },

    // More articles with varying titles for alphabet sorting
    {
      title: "Carbon Tax Implications",
      category: "Regulatory Updates",
      daysAgo: 14,
    },
    {
      title: "Banking Sector Reforms",
      category: "Regulatory Updates",
      daysAgo: 11,
    },
    {
      title: "Environmental Standards",
      category: "Regulatory Updates",
      daysAgo: 7,
    },

    // Additional articles for comprehensive testing
    {
      title: "Global Trade Agreements",
      category: "International Relations",
      daysAgo: 16,
    },
    {
      title: "Sanctions Impact Study",
      category: "International Relations",
      daysAgo: 13,
    },
    {
      title: "Diplomatic Relations Review",
      category: "International Relations",
      daysAgo: 9,
    },
    {
      title: "Currency War Analysis",
      category: "Market Discussion",
      daysAgo: 4,
    },
    {
      title: "Political Polarization Effects",
      category: "Political Analysis",
      daysAgo: 2,
    },
    {
      title: "Infrastructure Investment",
      category: "Economic Policy",
      daysAgo: 1,
    },
  ];

  // Create articles with varied content and specific timestamps
  for (let i = 0; i < articleData.length; i++) {
    const data = articleData[i];
    const articleDate = new Date(
      baseDate.getTime() - data.daysAgo * 24 * 60 * 60 * 1000,
    );

    // Create article with staggered timing
    await new Promise((resolve) => setTimeout(resolve, 10));

    const article: IEconPoliticalDiscussionArticle =
      await api.functional.econPoliticalDiscussion.registeredMember.articles.create(
        connection,
        {
          body: {
            title: data.title,
            content: `Comprehensive analysis of ${data.title.toLowerCase()}. This article examines current trends, historical context, and future implications for economic and political discourse. The analysis includes data-driven insights and expert opinions to provide a balanced perspective on this important topic.`,
            category: data.category,
            status: "published",
            econ_political_discussion_user_id: member.id,
          } satisfies IEconPoliticalDiscussionArticle.ICreate,
        },
      );
    typia.assert(article);
    articles.push(article);

    // Add slight delay to ensure timestamp differences
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  // Step 3: Test comprehensive sorting scenarios
  const sortingTests = [
    {
      field: "created_at",
      direction: "asc",
      description: "chronological ascending",
    },
    {
      field: "created_at",
      direction: "desc",
      description: "chronological descending",
    },
    {
      field: "updated_at",
      direction: "asc",
      description: "modification ascending",
    },
    {
      field: "updated_at",
      direction: "desc",
      description: "modification descending",
    },
    { field: "title", direction: "asc", description: "alphabetical ascending" },
    {
      field: "title",
      direction: "desc",
      description: "alphabetical descending",
    },
    { field: "category", direction: "asc", description: "category ascending" },
    {
      field: "category",
      direction: "desc",
      description: "category descending",
    },
  ];

  for (const sortTest of sortingTests) {
    const response: IPageIEconPoliticalDiscussionArticle.ISummary =
      await api.functional.econPoliticalDiscussion.registeredMember.users.articles.index(
        connection,
        {
          userId: member.id,
          body: {
            page: 1,
            limit: 50, // Large limit to get all articles
            order_by: sortTest.field as
              | "created_at"
              | "updated_at"
              | "title"
              | "category",
            order_direction: sortTest.direction as "asc" | "desc",
          } satisfies IEconPoliticalDiscussionArticle.IRequest,
        },
      );
    typia.assert(response);

    // Validate response structure
    TestValidator.equals(
      "pagination info exists",
      response.pagination !== undefined,
      true,
    );
    TestValidator.equals(
      "data array exists",
      Array.isArray(response.data),
      true,
    );
    TestValidator.equals(
      "all articles returned",
      response.data.length,
      articles.length,
    );
    TestValidator.equals(
      "pagination records match",
      response.pagination.records,
      articles.length,
    );

    // Validate sorting order based on field
    const sortedData = response.data;

    if (sortTest.field === "created_at" || sortTest.field === "updated_at") {
      // Date sorting validation
      for (let i = 0; i < sortedData.length - 1; i++) {
        const current = new Date(sortedData[i][sortTest.field]);
        const next = new Date(sortedData[i + 1][sortTest.field]);

        if (sortTest.direction === "asc") {
          TestValidator.predicate(
            `${sortTest.description}: item ${i} should be <= item ${i + 1}`,
            current.getTime() <= next.getTime(),
          );
        } else {
          TestValidator.predicate(
            `${sortTest.description}: item ${i} should be >= item ${i + 1}`,
            current.getTime() >= next.getTime(),
          );
        }
      }
    } else if (sortTest.field === "title") {
      // Title sorting validation
      for (let i = 0; i < sortedData.length - 1; i++) {
        const current = sortedData[i].title;
        const next = sortedData[i + 1].title;

        if (sortTest.direction === "asc") {
          TestValidator.predicate(
            `${sortTest.description}: "${current}" should be <= "${next}"`,
            current.localeCompare(next) <= 0,
          );
        } else {
          TestValidator.predicate(
            `${sortTest.description}: "${current}" should be >= "${next}"`,
            current.localeCompare(next) >= 0,
          );
        }
      }
    } else if (sortTest.field === "category") {
      // Category sorting validation
      for (let i = 0; i < sortedData.length - 1; i++) {
        const current = sortedData[i].category;
        const next = sortedData[i + 1].category;

        if (sortTest.direction === "asc") {
          TestValidator.predicate(
            `${sortTest.description}: "${current}" should be <= "${next}"`,
            current.localeCompare(next) <= 0,
          );
        } else {
          TestValidator.predicate(
            `${sortTest.description}: "${current}" should be >= "${next}"`,
            current.localeCompare(next) >= 0,
          );
        }
      }
    }

    // Validate data integrity - all articles should be present
    const returnedIds = sortedData.map((article) => article.id);
    const originalIds = articles.map((article) => article.id);

    TestValidator.equals(
      "data integrity: all articles returned in correct order",
      returnedIds.length,
      originalIds.length,
    );

    // Verify no duplicate articles
    const uniqueIds = [...new Set(returnedIds)];
    TestValidator.equals(
      "no duplicate articles",
      uniqueIds.length,
      returnedIds.length,
    );
  }

  // Step 4: Test pagination with sorting consistency
  const pageSize = 5;
  const totalPages = Math.ceil(articles.length / pageSize);

  for (let page = 1; page <= totalPages; page++) {
    const paginatedResponse: IPageIEconPoliticalDiscussionArticle.ISummary =
      await api.functional.econPoliticalDiscussion.registeredMember.users.articles.index(
        connection,
        {
          userId: member.id,
          body: {
            page: page,
            limit: pageSize,
            order_by: "created_at",
            order_direction: "desc",
          } satisfies IEconPoliticalDiscussionArticle.IRequest,
        },
      );
    typia.assert(paginatedResponse);

    // Validate pagination structure
    TestValidator.equals(
      "correct page number",
      paginatedResponse.pagination.current,
      page,
    );
    TestValidator.equals(
      "correct page size",
      paginatedResponse.data.length,
      page === totalPages ? articles.length % pageSize || pageSize : pageSize,
    );
    TestValidator.equals(
      "total pages correct",
      paginatedResponse.pagination.pages,
      totalPages,
    );
  }

  // Step 5: Test edge cases and performance
  // Test with very large limit
  const largeLimitResponse: IPageIEconPoliticalDiscussionArticle.ISummary =
    await api.functional.econPoliticalDiscussion.registeredMember.users.articles.index(
      connection,
      {
        userId: member.id,
        body: {
          page: 1,
          limit: 1000, // Much larger than dataset
          order_by: "title",
          order_direction: "asc",
        } satisfies IEconPoliticalDiscussionArticle.IRequest,
      },
    );
  typia.assert(largeLimitResponse);
  TestValidator.equals(
    "large limit returns all articles",
    largeLimitResponse.data.length,
    articles.length,
  );

  // Test data consistency across multiple requests
  const consistencyResponse1: IPageIEconPoliticalDiscussionArticle.ISummary =
    await api.functional.econPoliticalDiscussion.registeredMember.users.articles.index(
      connection,
      {
        userId: member.id,
        body: {
          page: 1,
          limit: 10,
          order_by: "category",
          order_direction: "desc",
        } satisfies IEconPoliticalDiscussionArticle.IRequest,
      },
    );
  typia.assert(consistencyResponse1);

  // Small delay to ensure no timing issues
  await new Promise((resolve) => setTimeout(resolve, 100));

  const consistencyResponse2: IPageIEconPoliticalDiscussionArticle.ISummary =
    await api.functional.econPoliticalDiscussion.registeredMember.users.articles.index(
      connection,
      {
        userId: member.id,
        body: {
          page: 1,
          limit: 10,
          order_by: "category",
          order_direction: "desc",
        } satisfies IEconPoliticalDiscussionArticle.IRequest,
      },
    );
  typia.assert(consistencyResponse2);

  // Verify consistent results
  TestValidator.equals(
    "consistent ordering across requests",
    consistencyResponse1.data.map((a) => a.id),
    consistencyResponse2.data.map((a) => a.id),
  );
}
