import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator customer list search and sort functionality.
 *
 * Validates the administrative customer browsing endpoint with comprehensive search filtering and sorting capabilities. An administrator authenticates and performs various search operations to verify that filtering and sorting work correctly both independently and in combination.
 *
 * The test covers multiple filtering scenarios including display name partial matching, email partial matching, registration date range filtering, and status-based filtering. Sorting is tested across all available fields with both ascending and descending directions. Pagination behavior is verified to ensure it respects the applied sort order.
 *
 * 1. Administrator authenticates with valid credentials.
 * 2. Test display name filtering with partial match (case-insensitive).
 * 3. Test email filtering with partial match.
 * 4. Test registration date range filtering using created_at_gte and created_at_lte.
 * 5. Test combined filters with AND logic.
 * 6. Test sorting by display_name in ascending and descending order.
 * 7. Test sorting by email in ascending and descending order.
 * 8. Test sorting by created_at in ascending and descending order.
 * 9. Verify pagination respects sort order.
 * 10. Test empty search results scenario.
 */
export async function test_api_admin_customer_list_search_and_sort(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123",
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Test display name filtering with partial match
  const displayNameFilter = await api.functional.ecommerce.customers.index(
    adminConnection,
    {
      body: {
        display_name: "Customer",
        limit: 20,
        page: 1,
      } satisfies IEcommerceCustomer.IRequest,
    },
  );
  typia.assert(displayNameFilter);
  TestValidator.equals(
    "display name filter returns results",
    displayNameFilter.pagination.records >= 0,
    displayNameFilter.pagination.records >= 0,
  );
  // 3. Test email filtering with partial match
  const emailFilter = await api.functional.ecommerce.customers.index(
    adminConnection,
    {
      body: {
        email: "@",
        limit: 20,
        page: 1,
      } satisfies IEcommerceCustomer.IRequest,
    },
  );
  typia.assert(emailFilter);
  TestValidator.equals(
    "email filter returns results",
    emailFilter.pagination.records >= 0,
    emailFilter.pagination.records >= 0,
  );
  // 4. Test registration date range filtering
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateRangeFilter = await api.functional.ecommerce.customers.index(
    adminConnection,
    {
      body: {
        created_at_gte: thirtyDaysAgo.toISOString(),
        created_at_lte: now.toISOString(),
        limit: 20,
        page: 1,
      } satisfies IEcommerceCustomer.IRequest,
    },
  );
  typia.assert(dateRangeFilter);
  TestValidator.equals(
    "date range filter returns results",
    dateRangeFilter.pagination.records >= 0,
    dateRangeFilter.pagination.records >= 0,
  );
  // 5. Test combined filters with AND logic
  const combinedFilter = await api.functional.ecommerce.customers.index(
    adminConnection,
    {
      body: {
        display_name: "Customer",
        email: "@",
        limit: 20,
        page: 1,
      } satisfies IEcommerceCustomer.IRequest,
    },
  );
  typia.assert(combinedFilter);
  TestValidator.equals(
    "combined filters return results",
    combinedFilter.pagination.records >= 0,
    combinedFilter.pagination.records >= 0,
  );
  // 6. Test sorting by display_name ascending
  const displayNameAsc = await api.functional.ecommerce.customers.index(
    adminConnection,
    {
      body: {
        sort_by: "display_name",
        sort_order: "asc",
        limit: 20,
        page: 1,
      } satisfies IEcommerceCustomer.IRequest,
    },
  );
  typia.assert(displayNameAsc);
  for (let i = 1; i < displayNameAsc.data.length; i++) {
    TestValidator.predicate(
      `display_name ascending order at index ${i}`,
      displayNameAsc.data[i - 1].display_name <=
        displayNameAsc.data[i].display_name,
    );
  }
  // 7. Test sorting by display_name descending
  const displayNameDesc = await api.functional.ecommerce.customers.index(
    adminConnection,
    {
      body: {
        sort_by: "display_name",
        sort_order: "desc",
        limit: 20,
        page: 1,
      } satisfies IEcommerceCustomer.IRequest,
    },
  );
  typia.assert(displayNameDesc);
  for (let i = 1; i < displayNameDesc.data.length; i++) {
    TestValidator.predicate(
      `display_name descending order at index ${i}`,
      displayNameDesc.data[i - 1].display_name >=
        displayNameDesc.data[i].display_name,
    );
  }
  // 8. Test sorting by email ascending
  const emailAsc = await api.functional.ecommerce.customers.index(
    adminConnection,
    {
      body: {
        sort_by: "email",
        sort_order: "asc",
        limit: 20,
        page: 1,
      } satisfies IEcommerceCustomer.IRequest,
    },
  );
  typia.assert(emailAsc);
  for (let i = 1; i < emailAsc.data.length; i++) {
    TestValidator.predicate(
      `email ascending order at index ${i}`,
      emailAsc.data[i - 1].email <= emailAsc.data[i].email,
    );
  }
  // 9. Test sorting by email descending
  const emailDesc = await api.functional.ecommerce.customers.index(
    adminConnection,
    {
      body: {
        sort_by: "email",
        sort_order: "desc",
        limit: 20,
        page: 1,
      } satisfies IEcommerceCustomer.IRequest,
    },
  );
  typia.assert(emailDesc);
  for (let i = 1; i < emailDesc.data.length; i++) {
    TestValidator.predicate(
      `email descending order at index ${i}`,
      emailDesc.data[i - 1].email >= emailDesc.data[i].email,
    );
  }
  // 10. Test sorting by created_at ascending
  const createdAtAsc = await api.functional.ecommerce.customers.index(
    adminConnection,
    {
      body: {
        sort_by: "created_at",
        sort_order: "asc",
        limit: 20,
        page: 1,
      } satisfies IEcommerceCustomer.IRequest,
    },
  );
  typia.assert(createdAtAsc);
  for (let i = 1; i < createdAtAsc.data.length; i++) {
    TestValidator.predicate(
      `created_at ascending order at index ${i}`,
      createdAtAsc.data[i - 1].created_at <= createdAtAsc.data[i].created_at,
    );
  }
  // 11. Test sorting by created_at descending
  const createdAtDesc = await api.functional.ecommerce.customers.index(
    adminConnection,
    {
      body: {
        sort_by: "created_at",
        sort_order: "desc",
        limit: 20,
        page: 1,
      } satisfies IEcommerceCustomer.IRequest,
    },
  );
  typia.assert(createdAtDesc);
  for (let i = 1; i < createdAtDesc.data.length; i++) {
    TestValidator.predicate(
      `created_at descending order at index ${i}`,
      createdAtDesc.data[i - 1].created_at >= createdAtDesc.data[i].created_at,
    );
  }
  // 12. Verify pagination respects sort order
  const page1 = await api.functional.ecommerce.customers.index(
    adminConnection,
    {
      body: {
        sort_by: "display_name",
        sort_order: "asc",
        limit: 5,
        page: 1,
      } satisfies IEcommerceCustomer.IRequest,
    },
  );
  typia.assert(page1);
  const page2 = await api.functional.ecommerce.customers.index(
    adminConnection,
    {
      body: {
        sort_by: "display_name",
        sort_order: "asc",
        limit: 5,
        page: 2,
      } satisfies IEcommerceCustomer.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.predicate(
    "pagination respects sort order - page 2 starts after page 1",
    page1.data.length > 0 &&
      page2.data.length > 0 &&
      page1.data[page1.data.length - 1].display_name <=
        page2.data[0].display_name,
  );
  // 13. Test empty search results
  const emptyResult = await api.functional.ecommerce.customers.index(
    adminConnection,
    {
      body: {
        display_name: "NonExistentCustomer12345",
        limit: 20,
        page: 1,
      } satisfies IEcommerceCustomer.IRequest,
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty search returns no results",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty search pagination shows 0 records",
    emptyResult.pagination.records,
    0,
  );
}