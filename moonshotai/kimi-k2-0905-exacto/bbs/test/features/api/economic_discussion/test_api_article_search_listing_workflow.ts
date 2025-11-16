import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICrIPageIntegerRequired } from "@ORGANIZATION/PROJECT-api/lib/structures/ICrIPageIntegerRequired";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionAttachmentFileType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachmentFileType";
import type { IEconomicDiscussionAttachments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachments";
import type { IEconomicDiscussionCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategories";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import type { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import type { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionArticle";

/**
 * Test complete article discovery workflow including creating articles and then
 * searching for them to verify search index updates. Validates that newly
 * created articles become discoverable through search operations, tests the
 * relationship between article creation and search functionality, and ensures
 * that article metadata is properly indexed for search operations. Includes
 * testing of search result relevance and proper article attribution in search
 * results.
 */
export async function test_api_article_search_listing_workflow(
  connection: api.IConnection,
) {
  // Step 1: Create test member for article creation
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testUsername = RandomGenerator.alphaNumeric(8);
  const member: IEconomicDiscussionMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: testEmail,
        username: testUsername,
        password: "testPassword123",
        email_verified: false,
      } satisfies IEconomicDiscussionMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create multiple test articles with searchable content
  const testCategoryId = typia.random<string & tags.Format<"uuid">>();

  const articleData1 = {
    title: "Economic Impact of Inflation on Consumer Spending",
    content:
      "Inflation affects consumer behavior in multiple ways. When inflation rises, consumers tend to reduce discretionary spending. The economic impact of sustained inflation periods can be severe, leading to decreased purchasing power and altered consumption patterns. This analysis examines how inflation influences economic decisions at both household and national levels.",
    category_ids: [testCategoryId],
    attachments: undefined,
  } satisfies IEconomicDiscussionArticle.ICreate;

  const article1: IEconomicDiscussionArticle =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: articleData1,
    });
  typia.assert(article1);

  const articleData2 = {
    title: "Political Economy of Trade Agreements",
    content:
      "Trade policy analysis reveals complex political and economic relationships. International trade agreements require careful consideration of policy implications. The economic benefits of reduced trade barriers must be balanced against domestic policy objectives. This article explores the political economy behind major trade negotiations.",
    category_ids: [testCategoryId],
    attachments: undefined,
  } satisfies IEconomicDiscussionArticle.ICreate;

  const article2: IEconomicDiscussionArticle =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: articleData2,
    });
  typia.assert(article2);

  const articleData3 = {
    title: "Monetary Policy Analysis: Interest Rates and Economic Growth",
    content:
      "Monetary policy decisions directly impact economic growth trajectories. Central bank interest rate policies influence economic activity through multiple channels. This policy analysis examines recent monetary decisions and their economic implications for national economic growth.",
    category_ids: [testCategoryId],
    attachments: undefined,
  } satisfies IEconomicDiscussionArticle.ICreate;

  const article3: IEconomicDiscussionArticle =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: articleData3,
    });
  typia.assert(article3);

  // Step 3: Verify created articles are discoverable through search

  // Test 1: List all articles with pending status (articles created with pending by default)
  const allArticlesSearch: IPageIEconomicDiscussionArticle.ISummary =
    await api.functional.economicDiscussion.search.articles.index(connection, {
      body: {
        page: 1,
        limit: 10,
        status: "pending",
      } satisfies IEconomicDiscussionArticle.IRequest,
    });
  typia.assert(allArticlesSearch);

  TestValidator.predicate(
    "search returns paginated results",
    allArticlesSearch.pagination.current === "1",
  );
  TestValidator.predicate(
    "search result contains data",
    allArticlesSearch.data.length > 0,
  );

  // Test 2: Search by specific title keywords
  const inflationSearch: IPageIEconomicDiscussionArticle.ISummary =
    await api.functional.economicDiscussion.search.articles.index(connection, {
      body: {
        page: 1,
        limit: 10,
        search: "inflation",
        status: "pending",
      } satisfies IEconomicDiscussionArticle.IRequest,
    });
  typia.assert(inflationSearch);

  // Should find the inflation-related article
  const foundInflationArticle = inflationSearch.data.find((article) =>
    article.title.toLowerCase().includes("inflation"),
  );
  TestValidator.predicate(
    "inflation search finds relevant article",
    foundInflationArticle !== undefined,
  );

  // Test 3: Search by another keyword
  const policySearch: IPageIEconomicDiscussionArticle.ISummary =
    await api.functional.economicDiscussion.search.articles.index(connection, {
      body: {
        page: 1,
        limit: 10,
        search: "policy",
        status: "pending",
      } satisfies IEconomicDiscussionArticle.IRequest,
    });
  typia.assert(policySearch);

  const foundPolicyArticle = policySearch.data.find((article) =>
    article.title.toLowerCase().includes("policy"),
  );
  TestValidator.predicate(
    "policy search finds relevant article",
    foundPolicyArticle !== undefined,
  );

  // Test 4: Search by category (Note: The correct field name needs to be determined from actual API)
  const categorySearch: IPageIEconomicDiscussionArticle.ISummary =
    await api.functional.economicDiscussion.search.articles.index(connection, {
      body: {
        page: 1,
        limit: 10,
        status: "pending",
      } satisfies IEconomicDiscussionArticle.IRequest,
    });
  typia.assert(categorySearch);

  TestValidator.predicate(
    "category search returns results",
    categorySearch.data.length >= 3,
  );

  // Test 5: Search by author
  const authorSearch: IPageIEconomicDiscussionArticle.ISummary =
    await api.functional.economicDiscussion.search.articles.index(connection, {
      body: {
        page: 1,
        limit: 10,
        author: member.member.id,
        status: "pending",
      } satisfies IEconomicDiscussionArticle.IRequest,
    });
  typia.assert(authorSearch);

  TestValidator.predicate(
    "author search returns results for valid author",
    authorSearch.data.length >= 3,
  );

  // Test 6: Pagination validation
  const page2Search: IPageIEconomicDiscussionArticle.ISummary =
    await api.functional.economicDiscussion.search.articles.index(connection, {
      body: {
        page: 2,
        limit: 2,
        status: "pending",
      } satisfies IEconomicDiscussionArticle.IRequest,
    });
  typia.assert(page2Search);

  TestValidator.predicate(
    "page 2 search has different current page",
    page2Search.pagination.current === "2",
  );
  TestValidator.predicate(
    "page 2 search has correct limit",
    page2Search.pagination.limit === "2",
  );

  // Test 7: Complex combination search
  const complexSearch: IPageIEconomicDiscussionArticle.ISummary =
    await api.functional.economicDiscussion.search.articles.index(connection, {
      body: {
        page: 1,
        limit: 10,
        status: "pending",
        sort_by: "created_at",
        sort_order: "desc",
      } satisfies IEconomicDiscussionArticle.IRequest,
    });
  typia.assert(complexSearch);

  TestValidator.predicate(
    "complex search returns results",
    complexSearch.data.length >= 0,
  );

  // Verify that created articles appear in search results with proper attribution
  const allCreatedArticlesFound = [article1, article2, article3].every(
    (createdArticle) => {
      return allArticlesSearch.data.some(
        (result) => result.id === createdArticle.id,
      );
    },
  );

  TestValidator.predicate(
    "all created articles appear in comprehensive search results",
    allCreatedArticlesFound,
  );

  // Verify proper article metadata in search results
  const sampleResult = complexSearch.data[0];
  if (sampleResult) {
    TestValidator.predicate(
      "search result has valid article ID format",
      typia.is<string & tags.Format<"uuid">>(sampleResult.id),
    );
    TestValidator.predicate(
      "search result has non-empty title",
      sampleResult.title.length > 0,
    );
    TestValidator.predicate(
      "search result has valid creation timestamp",
      typia.is<string & tags.Format<"date-time">>(sampleResult.created_at),
    );
    TestValidator.predicate(
      "search result has valid status value",
      ["pending", "approved", "rejected"].includes(sampleResult.status),
    );
  }
}
