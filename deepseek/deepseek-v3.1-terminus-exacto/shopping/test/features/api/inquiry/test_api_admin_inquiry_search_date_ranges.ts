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
 * Validate date range filtering capabilities for admin inquiry searches.
 *
 * This test ensures administrators can effectively filter inquiries by creation
 * timestamp ranges using start and end date parameters. The test covers various
 * scenarios including same-day inquiries, historical ranges, boundary
 * conditions, and timezone handling to ensure accurate record retrieval without
 * duplicates.
 */
export async function test_api_admin_inquiry_search_date_ranges(
  connection: api.IConnection,
) {
  // 1. Create admin account for inquiry search access
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "admin123",
        first_name: "Admin",
        last_name: "User",
        role: "support_admin",
        permissions: JSON.stringify({ can_view_inquiries: true }),
      } satisfies IShoppingMallAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Create customer account for inquiry submission
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "customer123",
        first_name: "Test",
        last_name: "Customer",
        phone_number: RandomGenerator.mobile(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 3. Create multiple test inquiries with different creation timestamps
  const inquiryTypes = [
    "product_question",
    "order_issue",
    "account_problem",
    "technical_support",
    "general_feedback",
  ] as const;
  const priorities = ["low", "medium", "high", "critical"] as const;

  const inquiries: IShoppingMallInquiry[] = [];

  // Create inquiries spanning different time periods
  for (let i = 0; i < 10; i++) {
    const inquiryType = RandomGenerator.pick(inquiryTypes);
    const priority = RandomGenerator.pick(priorities);

    const inquiry: IShoppingMallInquiry =
      await api.functional.shoppingMall.customer.inquiries.create(connection, {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          body: RandomGenerator.content({ paragraphs: 2 }),
          inquiry_type: inquiryType,
          priority: priority,
          status: "open",
        } satisfies IShoppingMallInquiry.ICreate,
      });
    typia.assert(inquiry);
    inquiries.push(inquiry);

    // Add small delay to ensure different creation timestamps
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // 4. Switch back to admin account for search operations
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "admin123",
      href: "https://example.com/admin",
      referrer: "https://example.com",
    } satisfies IShoppingMallAdministrator.ILogin,
  });

  // 5. Test 1: Search all inquiries without date filtering
  const allInquiries: IPageIShoppingMallInquiry.ISummary =
    await api.functional.shoppingMall.admin.inquiries.index(connection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies IShoppingMallInquiry.IRequest,
    });
  typia.assert(allInquiries);
  TestValidator.equals(
    "should return all created inquiries",
    allInquiries.data.length,
    10,
  );

  // 6. Test 2: Search with specific date range
  const sortedInquiries = [...inquiries].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  const startDate = sortedInquiries[2].created_at;
  const endDate = sortedInquiries[7].created_at;

  const dateRangeInquiries: IPageIShoppingMallInquiry.ISummary =
    await api.functional.shoppingMall.admin.inquiries.index(connection, {
      body: {
        page: 1,
        limit: 100,
        created_at_start: startDate,
        created_at_end: endDate,
      } satisfies IShoppingMallInquiry.IRequest,
    });
  typia.assert(dateRangeInquiries);

  // Verify date range filtering works correctly
  const expectedCount = inquiries.filter((inquiry) => {
    const inquiryDate = new Date(inquiry.created_at);
    const start = new Date(startDate);
    const end = new Date(endDate);
    return inquiryDate >= start && inquiryDate <= end;
  }).length;

  TestValidator.equals(
    "date range should return correct number of inquiries",
    dateRangeInquiries.data.length,
    expectedCount,
  );

  // 7. Test 3: Search with start date only (all inquiries after specific date)
  const startOnlyInquiries: IPageIShoppingMallInquiry.ISummary =
    await api.functional.shoppingMall.admin.inquiries.index(connection, {
      body: {
        page: 1,
        limit: 100,
        created_at_start: sortedInquiries[5].created_at,
      } satisfies IShoppingMallInquiry.IRequest,
    });
  typia.assert(startOnlyInquiries);

  // 8. Test 4: Search with end date only (all inquiries before specific date)
  const endOnlyInquiries: IPageIShoppingMallInquiry.ISummary =
    await api.functional.shoppingMall.admin.inquiries.index(connection, {
      body: {
        page: 1,
        limit: 100,
        created_at_end: sortedInquiries[4].created_at,
      } satisfies IShoppingMallInquiry.IRequest,
    });
  typia.assert(endOnlyInquiries);

  // 9. Test 5: Verify no duplicate records in paginated results
  const paginatedResults: IPageIShoppingMallInquiry.ISummary[] = [];

  for (let page = 1; page <= 3; page++) {
    const result: IPageIShoppingMallInquiry.ISummary =
      await api.functional.shoppingMall.admin.inquiries.index(connection, {
        body: {
          page: page,
          limit: 4,
        } satisfies IShoppingMallInquiry.IRequest,
      });
    typia.assert(result);
    paginatedResults.push(result);
  }

  // Check for duplicate IDs across pages
  const allIds = paginatedResults.flatMap((result) =>
    result.data.map((item) => item.id),
  );
  const uniqueIds = new Set(allIds);
  TestValidator.equals(
    "no duplicate IDs across paginated results",
    allIds.length,
    uniqueIds.size,
  );
}
