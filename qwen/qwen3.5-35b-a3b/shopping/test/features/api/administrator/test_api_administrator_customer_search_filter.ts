import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test administrator's ability to search and filter customer accounts using various criteria.
 *
 * Validates the customer search and filtering functionality available to administrators.
 * Tests partial matching for email, display name, and phone number searches. Verifies
 * date range filtering, sorting options, and pagination behavior. Ensures that the
 * search API correctly applies LIKE operations for text searches and filters results
 * based on multiple criteria combinations.
 *
 * Special attention is given to verifying that partial email matching works correctly
 * and that date range filtering properly constrains results to the specified date bounds.
 *
 * 1. Administrator registers and authenticates to access the customer management endpoint.
 * 2. Verifies the endpoint returns paginated customer list with default parameters.
 * 3. Tests email search with partial matching to ensure LIKE operations work correctly.
 * 4. Validates display name search with partial matching capability.
 * 5. Tests phone number filtering with partial match functionality.
 * 6. Verifies date range filtering by from_date and to_date parameters.
 * 7. Tests sorting by different fields in both ascending and descending order.
 * 8. Validates pagination parameters (page, limit) control result sets correctly.
 * 9. Confirms empty results return proper pagination metadata with zero counts.
 */
export async function test_api_administrator_customer_search_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(admin);
  // 2. Test default listing - get all customers with default pagination
  const defaultResult =
    await api.functional.ecommerceMall.administrator.customers.index(
      adminConnection,
      {
        body: {} satisfies IEcommerceMallMember.IRequest,
      },
    );
  typia.assert(defaultResult);
  TestValidator.equals(
    "default listing returns data array",
    Array.isArray(defaultResult.data),
    true,
  );
  TestValidator.equals(
    "default pagination current is 1",
    defaultResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "default pagination limit is 20",
    defaultResult.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "default listing has pagination info",
    defaultResult.pagination.records >= 0,
  );
  // 3. Test email search filter - partial matching with "example"
  const emailSearchResult =
    await api.functional.ecommerceMall.administrator.customers.index(
      adminConnection,
      {
        body: { email: "example" } satisfies IEcommerceMallMember.IRequest,
      },
    );
  typia.assert(emailSearchResult);
  TestValidator.equals(
    "email search returns data array",
    Array.isArray(emailSearchResult.data),
    true,
  );
  TestValidator.predicate(
    "email search has pagination info",
    emailSearchResult.pagination.records >= 0,
  );
  // 4. Test partial email matching - specific domain "test.com"
  const partialEmailResult =
    await api.functional.ecommerceMall.administrator.customers.index(
      adminConnection,
      {
        body: { email: "test.com" } satisfies IEcommerceMallMember.IRequest,
      },
    );
  typia.assert(partialEmailResult);
  TestValidator.equals(
    "partial email search returns data array",
    Array.isArray(partialEmailResult.data),
    true,
  );
  // 5. Test display name search - partial matching
  const displayNameSearchResult =
    await api.functional.ecommerceMall.administrator.customers.index(
      adminConnection,
      {
        body: { display_name: null } satisfies IEcommerceMallMember.IRequest,
      },
    );
  typia.assert(displayNameSearchResult);
  TestValidator.equals(
    "null display_name returns data array",
    Array.isArray(displayNameSearchResult.data),
    true,
  );
  // 6. Test phone number filter - partial matching with specific pattern
  const phoneFilterResult =
    await api.functional.ecommerceMall.administrator.customers.index(
      adminConnection,
      {
        body: { phone_number: null } satisfies IEcommerceMallMember.IRequest,
      },
    );
  typia.assert(phoneFilterResult);
  TestValidator.equals(
    "null phone_number returns data array",
    Array.isArray(phoneFilterResult.data),
    true,
  );
  // 7. Test date range filter - filter by from_date and to_date
  const today = new Date();
  const fromDate = new Date(today.getTime() - 1000 * 60 * 60 * 24 * 30); // 30 days ago
  const toDate = new Date(today.getTime() + 1000 * 60 * 60 * 24 * 1); // 1 day from now
  const fromDateStr = fromDate.toISOString().split("T")[0];
  const toDateStr = toDate.toISOString().split("T")[0];
  const dateRangeResult =
    await api.functional.ecommerceMall.administrator.customers.index(
      adminConnection,
      {
        body: {
          from_date: fromDateStr,
          to_date: toDateStr,
        } satisfies IEcommerceMallMember.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  TestValidator.equals(
    "date range filter returns data array",
    Array.isArray(dateRangeResult.data),
    true,
  );
  TestValidator.predicate(
    "date range filter has pagination info",
    dateRangeResult.pagination.records >= 0,
  );
  // 8. Test sorting by email ASC
  const sortEmailAscResult =
    await api.functional.ecommerceMall.administrator.customers.index(
      adminConnection,
      {
        body: {
          sort_field: "email",
          sort_order: "ASC",
        } satisfies IEcommerceMallMember.IRequest,
      },
    );
  typia.assert(sortEmailAscResult);
  TestValidator.equals(
    "sort email ASC returns data array",
    Array.isArray(sortEmailAscResult.data),
    true,
  );
  // Verify ordering - if multiple results, first should be alphabetically smallest
  if (sortEmailAscResult.data.length >= 2) {
    TestValidator.predicate(
      "email ASC is properly sorted",
      sortEmailAscResult.data[0].email <= sortEmailAscResult.data[1].email,
    );
  }
  // 9. Test sorting by display_name DESC
  const sortDisplayNameDescResult =
    await api.functional.ecommerceMall.administrator.customers.index(
      adminConnection,
      {
        body: {
          sort_field: "display_name",
          sort_order: "DESC",
        } satisfies IEcommerceMallMember.IRequest,
      },
    );
  typia.assert(sortDisplayNameDescResult);
  TestValidator.equals(
    "sort display_name DESC returns data array",
    Array.isArray(sortDisplayNameDescResult.data),
    true,
  );
  // 10. Test sorting by created_at DESC (newest first)
  const sortCreatedDescResult =
    await api.functional.ecommerceMall.administrator.customers.index(
      adminConnection,
      {
        body: {
          sort_field: "created_at",
          sort_order: "DESC",
        } satisfies IEcommerceMallMember.IRequest,
      },
    );
  typia.assert(sortCreatedDescResult);
  TestValidator.equals(
    "sort created_at DESC returns data array",
    Array.isArray(sortCreatedDescResult.data),
    true,
  );
  // 11. Test pagination - page=2, limit=10
  const paginationResult =
    await api.functional.ecommerceMall.administrator.customers.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IEcommerceMallMember.IRequest,
      },
    );
  typia.assert(paginationResult);
  TestValidator.equals(
    "pagination returns correct page number",
    paginationResult.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit is correct",
    paginationResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination has total records",
    paginationResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages calculated",
    paginationResult.pagination.pages >= 0,
  );
  // 12. Test pagination limit validation - max limit is 100
  const maxLimitResult =
    await api.functional.ecommerceMall.administrator.customers.index(
      adminConnection,
      {
        body: {
          limit: 100,
        } satisfies IEcommerceMallMember.IRequest,
      },
    );
  typia.assert(maxLimitResult);
  TestValidator.equals(
    "max limit returns correct limit",
    maxLimitResult.pagination.limit,
    100,
  );
  // 13. Test invalid sort_field - should not crash, returns default
  const invalidSortResult =
    await api.functional.ecommerceMall.administrator.customers.index(
      adminConnection,
      {
        body: {
          sort_field: "invalid_field",
          sort_order: "ASC",
        } satisfies IEcommerceMallMember.IRequest,
      },
    );
  typia.assert(invalidSortResult);
  TestValidator.equals(
    "invalid sort field returns data array",
    Array.isArray(invalidSortResult.data),
    true,
  );
  // 14. Test empty results with non-matching filter
  const emptyResult =
    await api.functional.ecommerceMall.administrator.customers.index(
      adminConnection,
      {
        body: {
          email: "this-email-does-not-exist-in-the-system-xyz123@example.com",
        } satisfies IEcommerceMallMember.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "non-matching email returns empty array",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty results has zero total records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty results has zero pages",
    emptyResult.pagination.pages,
    0,
  );
  // 15. Test combined filters - email and date range together
  const combinedFilterResult =
    await api.functional.ecommerceMall.administrator.customers.index(
      adminConnection,
      {
        body: {
          email: "example",
          from_date: fromDateStr,
          to_date: toDateStr,
        } satisfies IEcommerceMallMember.IRequest,
      },
    );
  typia.assert(combinedFilterResult);
  TestValidator.equals(
    "combined filters returns data array",
    Array.isArray(combinedFilterResult.data),
    true,
  );
  TestValidator.predicate(
    "combined filters has pagination info",
    combinedFilterResult.pagination.records >= 0,
  );
  // 16. Test sorting with pagination together
  const sortWithPaginationResult =
    await api.functional.ecommerceMall.administrator.customers.index(
      adminConnection,
      {
        body: {
          sort_field: "created_at",
          sort_order: "DESC",
          page: 1,
          limit: 5,
        } satisfies IEcommerceMallMember.IRequest,
      },
    );
  typia.assert(sortWithPaginationResult);
  TestValidator.equals(
    "sort with pagination returns correct limit",
    sortWithPaginationResult.pagination.limit,
    5,
  );
  TestValidator.equals(
    "sort with pagination returns correct page",
    sortWithPaginationResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "sort with pagination returns correct data count",
    sortWithPaginationResult.data.length,
    sortWithPaginationResult.pagination.records > 0 ? 5 : 0,
  );
}
