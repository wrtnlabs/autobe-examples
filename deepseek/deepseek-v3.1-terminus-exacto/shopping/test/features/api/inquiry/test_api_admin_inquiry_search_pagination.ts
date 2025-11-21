import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInquiry";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInquiry";

/**
 * Test pagination functionality for admin inquiry search operations.
 *
 * This comprehensive test validates that administrators can navigate through
 * large sets of inquiry results using page-based navigation with configurable
 * limits. The test creates multiple customer inquiries with different types,
 * priorities, and statuses to populate the search database. It then validates
 * pagination metadata including accurate record counts, page numbers, and total
 * page calculations.
 *
 * The test covers edge cases including empty result sets, single-page results,
 * and boundary conditions for page navigation. It also verifies that sorting by
 * creation date works correctly across paginated results.
 */
export async function test_api_admin_inquiry_search_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "admin123",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "support_admin",
        permissions: JSON.stringify({ can_view_inquiries: true }),
        status: "active",
      } satisfies IShoppingMallAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create customer account for inquiry creation
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "customer123",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        ip: "127.0.0.1",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // Step 3: Create multiple test inquiries with varied attributes
  const inquiryTypes = [
    "product_question",
    "order_issue",
    "account_problem",
    "technical_support",
    "general_feedback",
  ] as const;
  const priorities = ["low", "medium", "high", "critical"] as const;
  const statuses = [
    "open",
    "in_progress",
    "awaiting_response",
    "resolved",
    "closed",
  ] as const;

  const createdInquiries: IShoppingMallInquiry[] = [];

  // Create 25 inquiries to ensure multiple pages
  for (let i = 0; i < 25; i++) {
    const inquiryType = RandomGenerator.pick(inquiryTypes);
    const priority = RandomGenerator.pick(priorities);
    const status = RandomGenerator.pick(statuses);

    const inquiry: IShoppingMallInquiry =
      await api.functional.shoppingMall.customer.inquiries.create(connection, {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 8,
          }),
          body: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 5,
            sentenceMax: 10,
            wordMin: 3,
            wordMax: 8,
          }),
          inquiry_type: inquiryType,
          priority: priority,
          status: "open",
        } satisfies IShoppingMallInquiry.ICreate,
      });
    typia.assert(inquiry);
    createdInquiries.push(inquiry);
  }

  // Step 4: Switch back to admin account for search operations
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "admin123",
      ip: "127.0.0.1",
      href: "https://example.com/admin",
      referrer: "https://example.com",
    } satisfies IShoppingMallAdministrator.ILogin,
  });

  // Step 5: Test basic pagination with default parameters
  const defaultSearch: IPageIShoppingMallInquiry.ISummary =
    await api.functional.shoppingMall.admin.inquiries.index(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallInquiry.IRequest,
    });
  typia.assert(defaultSearch);

  // Validate pagination metadata
  TestValidator.equals(
    "default search should return pagination data",
    defaultSearch.pagination.current,
    1,
  );
  TestValidator.predicate(
    "total records should be at least 25",
    defaultSearch.pagination.records >= 25,
  );
  TestValidator.predicate(
    "page limit should be 10",
    defaultSearch.pagination.limit === 10,
  );
  TestValidator.predicate(
    "total pages should be calculated correctly",
    defaultSearch.pagination.pages ===
      Math.ceil(defaultSearch.pagination.records / 10),
  );

  // Step 6: Test custom page sizes
  const customLimitSearch: IPageIShoppingMallInquiry.ISummary =
    await api.functional.shoppingMall.admin.inquiries.index(connection, {
      body: {
        page: 1,
        limit: 5,
      } satisfies IShoppingMallInquiry.IRequest,
    });
  typia.assert(customLimitSearch);

  TestValidator.equals(
    "custom limit should return correct page size",
    customLimitSearch.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "data array should have correct size",
    customLimitSearch.data.length <= 5,
  );

  // Step 7: Test maximum limit boundary
  const maxLimitSearch: IPageIShoppingMallInquiry.ISummary =
    await api.functional.shoppingMall.admin.inquiries.index(connection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies IShoppingMallInquiry.IRequest,
    });
  typia.assert(maxLimitSearch);

  TestValidator.equals(
    "maximum limit should be 100",
    maxLimitSearch.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "data array should not exceed maximum limit",
    maxLimitSearch.data.length <= 100,
  );

  // Step 8: Test multiple pages
  const page2Search: IPageIShoppingMallInquiry.ISummary =
    await api.functional.shoppingMall.admin.inquiries.index(connection, {
      body: {
        page: 2,
        limit: 10,
      } satisfies IShoppingMallInquiry.IRequest,
    });
  typia.assert(page2Search);

  TestValidator.equals(
    "page 2 should have correct page number",
    page2Search.pagination.current,
    2,
  );

  // Validate pagination metadata consistency across pages
  TestValidator.equals(
    "total records should be consistent across pages",
    defaultSearch.pagination.records,
    page2Search.pagination.records,
  );
  TestValidator.equals(
    "page limit should be consistent across pages",
    defaultSearch.pagination.limit,
    page2Search.pagination.limit,
  );
  TestValidator.equals(
    "total pages should be consistent across pages",
    defaultSearch.pagination.pages,
    page2Search.pagination.pages,
  );

  // Step 9: Test sorting by creation date
  const sortedSearch: IPageIShoppingMallInquiry.ISummary =
    await api.functional.shoppingMall.admin.inquiries.index(connection, {
      body: {
        page: 1,
        limit: 10,
        order_by: "created_at",
        order_direction: "desc",
      } satisfies IShoppingMallInquiry.IRequest,
    });
  typia.assert(sortedSearch);

  // Validate that results are sorted by creation date (newest first)
  if (sortedSearch.data.length > 1) {
    for (let i = 0; i < sortedSearch.data.length - 1; i++) {
      const current = new Date(sortedSearch.data[i].created_at);
      const next = new Date(sortedSearch.data[i + 1].created_at);
      TestValidator.predicate(
        "results should be sorted by creation date descending",
        current >= next,
      );
    }
  }

  // Step 10: Test filtering with specific inquiry type
  const filteredSearch: IPageIShoppingMallInquiry.ISummary =
    await api.functional.shoppingMall.admin.inquiries.index(connection, {
      body: {
        page: 1,
        limit: 10,
        inquiry_type: "product_question",
      } satisfies IShoppingMallInquiry.IRequest,
    });
  typia.assert(filteredSearch);

  // Validate all returned inquiries match the filter
  for (const inquiry of filteredSearch.data) {
    TestValidator.equals(
      "filtered results should match inquiry type",
      inquiry.inquiry_type,
      "product_question",
    );
  }

  // Step 11: Test combination filtering with priority and status
  const combinationSearch: IPageIShoppingMallInquiry.ISummary =
    await api.functional.shoppingMall.admin.inquiries.index(connection, {
      body: {
        page: 1,
        limit: 10,
        priority: "high",
        status: "open",
      } satisfies IShoppingMallInquiry.IRequest,
    });
  typia.assert(combinationSearch);

  // Validate all returned inquiries match the combined filters
  for (const inquiry of combinationSearch.data) {
    TestValidator.equals(
      "combination filtered results should match priority",
      inquiry.priority,
      "high",
    );
    TestValidator.equals(
      "combination filtered results should match status",
      inquiry.status,
      "open",
    );
  }

  // Step 12: Test boundary conditions - last page
  const totalPages = defaultSearch.pagination.pages;
  const lastPageSearch: IPageIShoppingMallInquiry.ISummary =
    await api.functional.shoppingMall.admin.inquiries.index(connection, {
      body: {
        page: totalPages,
        limit: 10,
      } satisfies IShoppingMallInquiry.IRequest,
    });
  typia.assert(lastPageSearch);

  TestValidator.equals(
    "last page should have correct page number",
    lastPageSearch.pagination.current,
    totalPages,
  );

  // Step 13: Test empty result set with non-matching filter
  const emptySearch: IPageIShoppingMallInquiry.ISummary =
    await api.functional.shoppingMall.admin.inquiries.index(connection, {
      body: {
        page: 1,
        limit: 10,
        inquiry_type: "product_question",
        priority: "critical",
        status: "closed",
        search: "nonexistent_search_term_12345",
      } satisfies IShoppingMallInquiry.IRequest,
    });
  typia.assert(emptySearch);

  TestValidator.equals(
    "empty search should return zero records",
    emptySearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search should return empty data array",
    emptySearch.data.length,
    0,
  );
  TestValidator.equals(
    "empty search should have correct page count",
    emptySearch.pagination.pages,
    0,
  );

  // Step 14: Validate pagination consistency across pages
  const page1Data = defaultSearch.data.map((inquiry) => inquiry.id);
  const page2Data = page2Search.data.map((inquiry) => inquiry.id);

  // Ensure no overlap between pages
  for (const page1Id of page1Data) {
    for (const page2Id of page2Data) {
      TestValidator.notEquals(
        "page 1 and page 2 should have different inquiries",
        page1Id,
        page2Id,
      );
    }
  }

  // Step 15: Test search functionality
  const searchTerm = createdInquiries[0].title.substring(0, 5);
  const searchResults: IPageIShoppingMallInquiry.ISummary =
    await api.functional.shoppingMall.admin.inquiries.index(connection, {
      body: {
        page: 1,
        limit: 10,
        search: searchTerm,
      } satisfies IShoppingMallInquiry.IRequest,
    });
  typia.assert(searchResults);

  TestValidator.predicate(
    "search should return matching results",
    searchResults.pagination.records > 0,
  );

  // Validate that search results contain the search term
  for (const inquiry of searchResults.data) {
    TestValidator.predicate(
      "search results should contain search term in title or body",
      inquiry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inquiry.body.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }
}
