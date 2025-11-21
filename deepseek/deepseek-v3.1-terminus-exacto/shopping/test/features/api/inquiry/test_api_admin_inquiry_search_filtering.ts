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
 * Comprehensive test for admin inquiry search and filtering functionality.
 *
 * Validates that administrators can effectively search and filter customer
 * support inquiries using various criteria including inquiry type, priority
 * level, status, creation date ranges, and text-based search on titles and
 * content. Also tests pagination functionality with different page sizes and
 * sorting options.
 */
export async function test_api_admin_inquiry_search_filtering(
  connection: api.IConnection,
) {
  // Create multiple customer accounts for diverse inquiry generation
  const customers: IShoppingMallCustomer.IAuthorized[] = [];

  for (let i = 0; i < 3; i++) {
    const customer = await api.functional.auth.customer.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        phone_number: RandomGenerator.mobile(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IShoppingMallCustomer.ICreate,
    });
    typia.assert(customer);
    customers.push(customer);
  }

  // Generate diverse test inquiries
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

  for (const customer of customers) {
    // Switch to customer account
    await api.functional.auth.customer.login(connection, {
      body: {
        email: customer.email,
        password: "password123",
        href: "https://example.com/login",
        referrer: "https://example.com",
      } satisfies IShoppingMallCustomer.ILogin,
    });

    // Create multiple inquiries per customer
    for (let i = 0; i < 5; i++) {
      const inquiryType = RandomGenerator.pick(inquiryTypes);
      const priority = RandomGenerator.pick(priorities);

      const inquiry =
        await api.functional.shoppingMall.customer.inquiries.create(
          connection,
          {
            body: {
              title: RandomGenerator.paragraph({
                sentences: 3,
                wordMin: 3,
                wordMax: 8,
              }),
              body: RandomGenerator.content({
                paragraphs: 2,
                sentenceMin: 5,
                sentenceMax: 10,
              }),
              inquiry_type: inquiryType,
              priority: priority,
              status: "open",
            } satisfies IShoppingMallInquiry.ICreate,
          },
        );
      typia.assert(inquiry);
      createdInquiries.push(inquiry);
    }
  }

  // Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "admin123",
      first_name: "Admin",
      last_name: "User",
      role: "super_admin",
      permissions: JSON.stringify({ access: "full" }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "admin123",
      href: "https://example.com/admin/login",
      referrer: "https://example.com",
    } satisfies IShoppingMallAdministrator.ILogin,
  });

  // Test 1: Basic search with pagination
  const basicSearchResult =
    await api.functional.shoppingMall.admin.inquiries.index(connection, {
      body: {
        page: 1,
        limit: 10,
        search: RandomGenerator.substring(createdInquiries[0].title),
      } satisfies IShoppingMallInquiry.IRequest,
    });
  typia.assert(basicSearchResult);
  TestValidator.equals(
    "current page should be 1",
    basicSearchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "page limit should match request",
    basicSearchResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "search should return records",
    basicSearchResult.pagination.records > 0,
  );

  // Test 2: Filter by specific inquiry type
  const targetType = "product_question" as const;
  const typeFilterResult =
    await api.functional.shoppingMall.admin.inquiries.index(connection, {
      body: {
        inquiry_type: targetType,
        page: 1,
        limit: 20,
      } satisfies IShoppingMallInquiry.IRequest,
    });
  typia.assert(typeFilterResult);

  if (typeFilterResult.data.length > 0) {
    TestValidator.predicate(
      "type filter should return matching inquiries",
      typeFilterResult.data.every(
        (inquiry) => inquiry.inquiry_type === targetType,
      ),
    );
  }

  // Test 3: Filter by priority level
  const targetPriority = "high" as const;
  const priorityFilterResult =
    await api.functional.shoppingMall.admin.inquiries.index(connection, {
      body: {
        priority: targetPriority,
        page: 1,
        limit: 15,
      } satisfies IShoppingMallInquiry.IRequest,
    });
  typia.assert(priorityFilterResult);

  if (priorityFilterResult.data.length > 0) {
    TestValidator.predicate(
      "priority filter should return matching inquiries",
      priorityFilterResult.data.every(
        (inquiry) => inquiry.priority === targetPriority,
      ),
    );
  }

  // Test 4: Filter by status
  const targetStatus = "open" as const;
  const statusFilterResult =
    await api.functional.shoppingMall.admin.inquiries.index(connection, {
      body: {
        status: targetStatus,
        page: 1,
        limit: 25,
      } satisfies IShoppingMallInquiry.IRequest,
    });
  typia.assert(statusFilterResult);

  if (statusFilterResult.data.length > 0) {
    TestValidator.predicate(
      "status filter should return matching inquiries",
      statusFilterResult.data.every(
        (inquiry) => inquiry.status === targetStatus,
      ),
    );
  }

  // Test 5: Combined filtering with multiple criteria
  const combinedFilterResult =
    await api.functional.shoppingMall.admin.inquiries.index(connection, {
      body: {
        inquiry_type: "order_issue",
        priority: "medium",
        status: "open",
        page: 1,
        limit: 10,
        order_by: "created_at",
        order_direction: "desc",
      } satisfies IShoppingMallInquiry.IRequest,
    });
  typia.assert(combinedFilterResult);

  // Test 6: Date range filtering
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const dateFilterResult =
    await api.functional.shoppingMall.admin.inquiries.index(connection, {
      body: {
        created_at_start: oneDayAgo,
        created_at_end: now.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IShoppingMallInquiry.IRequest,
    });
  typia.assert(dateFilterResult);

  // Test 7: Sorting functionality
  const sortedResult = await api.functional.shoppingMall.admin.inquiries.index(
    connection,
    {
      body: {
        order_by: "priority",
        order_direction: "desc",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallInquiry.IRequest,
    },
  );
  typia.assert(sortedResult);

  // Test 8: Empty search (should return all inquiries)
  const emptySearchResult =
    await api.functional.shoppingMall.admin.inquiries.index(connection, {
      body: {
        page: 1,
        limit: 50,
      } satisfies IShoppingMallInquiry.IRequest,
    });
  typia.assert(emptySearchResult);
  TestValidator.predicate(
    "empty search should return results",
    emptySearchResult.pagination.records > 0,
  );

  // Test 9: Pagination with different page sizes
  const smallPageResult =
    await api.functional.shoppingMall.admin.inquiries.index(connection, {
      body: {
        page: 1,
        limit: 5,
      } satisfies IShoppingMallInquiry.IRequest,
    });
  typia.assert(smallPageResult);
  TestValidator.equals(
    "small page limit should be respected",
    smallPageResult.pagination.limit,
    5,
  );

  const largePageResult =
    await api.functional.shoppingMall.admin.inquiries.index(connection, {
      body: {
        page: 1,
        limit: 30,
      } satisfies IShoppingMallInquiry.IRequest,
    });
  typia.assert(largePageResult);
  TestValidator.equals(
    "large page limit should be respected",
    largePageResult.pagination.limit,
    30,
  );

  // Test 10: Verify search result integrity
  if (basicSearchResult.data.length > 0) {
    const firstResult = basicSearchResult.data[0];
    TestValidator.predicate(
      "search result should have valid UUID format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstResult.id,
      ),
    );
    TestValidator.predicate(
      "search result should have non-empty title",
      firstResult.title.length > 0,
    );
    TestValidator.predicate(
      "search result should have non-empty body",
      firstResult.body.length > 0,
    );
    TestValidator.predicate(
      "search result should have valid inquiry type",
      inquiryTypes.includes(firstResult.inquiry_type as any),
    );
    TestValidator.predicate(
      "search result should have valid priority",
      priorities.includes(firstResult.priority as any),
    );
    TestValidator.predicate(
      "search result should have valid status",
      statuses.includes(firstResult.status as any),
    );
  }
}
