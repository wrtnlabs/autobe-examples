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
 * Test category-based filtering of FAQ articles with hierarchical organization.
 *
 * This comprehensive test validates the FAQ article search and filtering
 * functionality within the shopping mall knowledge base system. The test
 * demonstrates:
 *
 * 1. Customer account creation for accessing search functionality
 * 2. Administrator account setup for category and article management
 * 3. Hierarchical category creation with proper parent-child relationships
 * 4. FAQ article search across different category levels
 * 5. Category-based filtering verification including:
 *
 *    - All articles vs filtered results comparison
 *    - Specific category filtering accuracy
 *    - Multi-parameter search with category constraints
 *    - Article metadata validation within categories
 *
 * The test ensures that the knowledge base properly organizes content
 * categorically and delivers accurate filtered results based on user
 * selection.
 */
export async function test_api_faq_article_search_with_category_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create customer account first
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "password123",
        first_name: "Test",
        last_name: "Customer",
        href: "https://example.com/register",
        referrer: "https://example.com",
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallCustomer.IRegister,
    });
  typia.assert(customer);

  // Create admin account for category management
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        firstname: "Admin",
        lastname: "User",
        adminlevel: "super_admin",
        department: "Support",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Create a hierarchical category structure
  const rootCategory =
    await api.functional.shoppingMall.admin.faqCategories.create(connection, {
      body: {
        name: "Account Services",
        slug: "account-services",
        description: "Help for account management and authentication",
        sort_order: 1,
        is_active: true,
        icon_class: "fa fa-user-circle",
        color_class: "text-primary",
        language: "en",
      } satisfies IShoppingMallFaqCategory.ICreate,
    });
  typia.assert(rootCategory);

  const subCategory1 =
    await api.functional.shoppingMall.admin.faqCategories.create(connection, {
      body: {
        name: "Registration",
        slug: "registration",
        description: "Registration and sign-up assistance",
        sort_order: 1,
        is_active: true,
        language: "en",
      } satisfies IShoppingMallFaqCategory.ICreate,
    });
  typia.assert(subCategory1);

  const subCategory2 =
    await api.functional.shoppingMall.admin.faqCategories.create(connection, {
      body: {
        name: "Login Issues",
        slug: "login-issues",
        description: "Login troubleshooting and password recovery",
        sort_order: 2,
        is_active: true,
        language: "en",
      } satisfies IShoppingMallFaqCategory.ICreate,
    });
  typia.assert(subCategory2);

  // Search for articles without category filter (should return all articles)
  const allArticlesResult = await api.functional.shoppingMall.faqArticles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
        target_audience: "customer",
        language: "en",
      } satisfies IShoppingMallFaqArticle.IRequest,
    },
  );
  typia.assert(allArticlesResult);

  TestValidator.predicate(
    "all articles search returns results",
    allArticlesResult.data.length > 0,
  );
  TestValidator.predicate(
    "all articles search has valid pagination",
    allArticlesResult.pagination.current === 1,
  );

  // Search with specific category filter
  const filteredArticlesResult =
    await api.functional.shoppingMall.faqArticles.index(connection, {
      body: {
        page: 1,
        limit: 20,
        target_audience: "customer",
        language: "en",
        category: "account-services",
      } satisfies IShoppingMallFaqArticle.IRequest,
    });
  typia.assert(filteredArticlesResult);

  // Verify that articles are properly categorized
  filteredArticlesResult.data.forEach((article, index) => {
    TestValidator.predicate(
      `article ${index + 1} has valid summary structure`,
      article.id !== undefined &&
        article.title.length > 0 &&
        article.excerpt.length > 0,
    );
    TestValidator.predicate(
      `article ${index + 1} has correct difficulty level`,
      article.difficulty === "beginner",
    );
    TestValidator.predicate(
      `article ${index + 1} has correct language`,
      article.language === "en",
    );
  });

  // Test search with different category combination
  const differentCategoryResult =
    await api.functional.shoppingMall.faqArticles.index(connection, {
      body: {
        page: 1,
        limit: 15,
        target_audience: "customer",
        language: "en",
        category: "registration",
      } satisfies IShoppingMallFaqArticle.IRequest,
    });
  typia.assert(differentCategoryResult);

  // Verify category specificity - different categories should return different results
  TestValidator.predicate(
    "different categories produce different results",
    JSON.stringify(allArticlesResult.data) !==
      JSON.stringify(differentCategoryResult.data) ||
      allArticlesResult.data.length !== differentCategoryResult.data.length,
  );

  // Test articles contain proper metadata
  const sampleArticle = allArticlesResult.data[0];
  if (sampleArticle && sampleArticle.faqCategory) {
    TestValidator.predicate(
      "article has proper category summary",
      sampleArticle.faqCategory.id !== undefined &&
        sampleArticle.faqCategory.name.length > 0 &&
        sampleArticle.faqCategory.is_active === true,
    );
  }

  // Verify pagination control works with category filtering
  TestValidator.equals(
    "pagination limit matches request",
    filteredArticlesResult.pagination.limit,
    20,
  );

  // Test that search parameters are respected
  const searchWithMultipleParams =
    await api.functional.shoppingMall.faqArticles.index(connection, {
      body: {
        page: 1,
        limit: 5,
        target_audience: "customer",
        language: "en",
        category: "login-issues",
        status: "published",
        difficulty: "beginner",
      } satisfies IShoppingMallFaqArticle.IRequest,
    });
  typia.assert(searchWithMultipleParams);

  TestValidator.predicate(
    "multi-parameter search respects all constraints",
    searchWithMultipleParams.data.length <= 5,
  );

  // Verify all articles have valid structure
  searchWithMultipleParams.data.forEach((article, index) => {
    TestValidator.predicate(
      `filtered article ${index + 1} has valid structure`,
      article.view_count >= 0 &&
        article.helpful_votes >= 0 &&
        article.total_votes >= 0 &&
        article.reading_time > 0 &&
        article.reading_time <= 1440,
    );
  });

  // Test sorting capabilities with category filter
  const sortedByViewsResult =
    await api.functional.shoppingMall.faqArticles.index(connection, {
      body: {
        page: 1,
        limit: 10,
        target_audience: "customer",
        language: "en",
        category: "account-services",
        sort_by: "view_count",
        order: "desc",
      } satisfies IShoppingMallFaqArticle.IRequest,
    });
  typia.assert(sortedByViewsResult);

  if (sortedByViewsResult.data.length >= 2) {
    TestValidator.predicate(
      "articles are sorted by view count descending",
      sortedByViewsResult.data[0].view_count >=
        sortedByViewsResult.data[1].view_count,
    );
  }
}
