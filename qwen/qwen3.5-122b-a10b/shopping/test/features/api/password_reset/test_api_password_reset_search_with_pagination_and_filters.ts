import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCustomerPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test password reset search with pagination and filters.
 *
 * Validates the password reset search endpoint's filtering and pagination capabilities. Tests various filter combinations including date ranges, usage status, and expiration status filters. Ensures pagination metadata is accurate and empty results are handled correctly.
 *
 * The test creates a customer account and performs multiple search queries with different filter configurations to validate the search functionality.
 *
 * 1. Create customer account for authentication.
 * 2. Test basic search without filters returns paginated results.
 * 3. Test creation date range filtering (created_at_from/to).
 * 4. Test expiration date range filtering (expires_at_from/to).
 * 5. Test usage status filtering (is_used: true/false/null).
 * 6. Test expiration status filtering (is_expired: true/false/null).
 * 7. Test combined filters with pagination.
 * 8. Test empty result set handling.
 * 9. Test maximum limit enforcement (1000 records).
 */
export async function test_api_password_reset_search_with_pagination_and_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account for authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Test basic search without filters
  const basicSearch =
    await api.functional.ecommerce.customer.password_resets.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceCustomerPasswordReset.IRequest,
      },
    );
  typia.assert(basicSearch);
  TestValidator.equals(
    "basic search has pagination",
    basicSearch.pagination.current,
    1,
  );
  TestValidator.predicate(
    "basic search has limit",
    basicSearch.pagination.limit > 0,
  );
  TestValidator.predicate(
    "basic search has record count",
    basicSearch.pagination.records >= 0,
  );
  TestValidator.predicate(
    "basic search has page count",
    basicSearch.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "basic search data is array",
    Array.isArray(basicSearch.data),
  );
  // 3. Test creation date range filtering
  const now = new Date();
  const pastDate = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30); // 30 days ago
  const futureDate = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30); // 30 days ahead
  const dateRangeSearch =
    await api.functional.ecommerce.customer.password_resets.index(
      customerConnection,
      {
        body: {
          created_at_from: pastDate.toISOString(),
          created_at_to: futureDate.toISOString(),
          page: 1,
          limit: 20,
        } satisfies IEcommerceCustomerPasswordReset.IRequest,
      },
    );
  typia.assert(dateRangeSearch);
  TestValidator.equals(
    "date range search has pagination",
    dateRangeSearch.pagination.current,
    1,
  );
  TestValidator.equals(
    "date range search has data",
    Array.isArray(dateRangeSearch.data),
    true,
  );
  // 4. Test expiration date range filtering
  const expirationRangeSearch =
    await api.functional.ecommerce.customer.password_resets.index(
      customerConnection,
      {
        body: {
          expires_at_from: pastDate.toISOString(),
          expires_at_to: futureDate.toISOString(),
          page: 1,
          limit: 20,
        } satisfies IEcommerceCustomerPasswordReset.IRequest,
      },
    );
  typia.assert(expirationRangeSearch);
  TestValidator.equals(
    "expiration range search has pagination",
    expirationRangeSearch.pagination.current,
    1,
  );
  TestValidator.equals(
    "expiration range search has data",
    Array.isArray(expirationRangeSearch.data),
    true,
  );
  // 5. Test usage status filtering (is_used: true)
  const usedSearch =
    await api.functional.ecommerce.customer.password_resets.index(
      customerConnection,
      {
        body: {
          is_used: true,
          page: 1,
          limit: 20,
        } satisfies IEcommerceCustomerPasswordReset.IRequest,
      },
    );
  typia.assert(usedSearch);
  TestValidator.equals(
    "used search has pagination",
    usedSearch.pagination.current,
    1,
  );
  TestValidator.predicate(
    "used search data is array",
    Array.isArray(usedSearch.data),
  );
  // 6. Test usage status filtering (is_used: false)
  const unusedSearch =
    await api.functional.ecommerce.customer.password_resets.index(
      customerConnection,
      {
        body: {
          is_used: false,
          page: 1,
          limit: 20,
        } satisfies IEcommerceCustomerPasswordReset.IRequest,
      },
    );
  typia.assert(unusedSearch);
  TestValidator.equals(
    "unused search has pagination",
    unusedSearch.pagination.current,
    1,
  );
  TestValidator.predicate(
    "unused search data is array",
    Array.isArray(unusedSearch.data),
  );
  // 7. Test expiration status filtering (is_expired: true)
  const expiredSearch =
    await api.functional.ecommerce.customer.password_resets.index(
      customerConnection,
      {
        body: {
          is_expired: true,
          page: 1,
          limit: 20,
        } satisfies IEcommerceCustomerPasswordReset.IRequest,
      },
    );
  typia.assert(expiredSearch);
  TestValidator.equals(
    "expired search has pagination",
    expiredSearch.pagination.current,
    1,
  );
  TestValidator.predicate(
    "expired search data is array",
    Array.isArray(expiredSearch.data),
  );
  // 8. Test expiration status filtering (is_expired: false)
  const activeSearch =
    await api.functional.ecommerce.customer.password_resets.index(
      customerConnection,
      {
        body: {
          is_expired: false,
          page: 1,
          limit: 20,
        } satisfies IEcommerceCustomerPasswordReset.IRequest,
      },
    );
  typia.assert(activeSearch);
  TestValidator.equals(
    "active search has pagination",
    activeSearch.pagination.current,
    1,
  );
  TestValidator.predicate(
    "active search data is array",
    Array.isArray(activeSearch.data),
  );
  // 9. Test combined filters with pagination
  const combinedSearch =
    await api.functional.ecommerce.customer.password_resets.index(
      customerConnection,
      {
        body: {
          created_at_from: pastDate.toISOString(),
          created_at_to: futureDate.toISOString(),
          is_used: null,
          is_expired: null,
          page: 1,
          limit: 50,
        } satisfies IEcommerceCustomerPasswordReset.IRequest,
      },
    );
  typia.assert(combinedSearch);
  TestValidator.equals(
    "combined search has pagination",
    combinedSearch.pagination.current,
    1,
  );
  TestValidator.predicate(
    "combined search has valid limit",
    combinedSearch.pagination.limit <= 1000,
  );
  TestValidator.predicate(
    "combined search data is array",
    Array.isArray(combinedSearch.data),
  );
  // 10. Test pagination across multiple pages
  const page2Search =
    await api.functional.ecommerce.customer.password_resets.index(
      customerConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IEcommerceCustomerPasswordReset.IRequest,
      },
    );
  typia.assert(page2Search);
  TestValidator.equals(
    "page 2 search has correct page",
    page2Search.pagination.current,
    2,
  );
  TestValidator.predicate(
    "page 2 search has limit",
    page2Search.pagination.limit > 0,
  );
  // 11. Test empty result set handling (search with unlikely filters)
  const emptySearch =
    await api.functional.ecommerce.customer.password_resets.index(
      customerConnection,
      {
        body: {
          created_at_from: "2099-01-01T00:00:00.000Z",
          created_at_to: "2099-12-31T23:59:59.999Z",
          page: 1,
          limit: 10,
        } satisfies IEcommerceCustomerPasswordReset.IRequest,
      },
    );
  typia.assert(emptySearch);
  TestValidator.equals(
    "empty search has page 1",
    emptySearch.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty search has zero records",
    emptySearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search has zero pages",
    emptySearch.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty search data is empty array",
    emptySearch.data.length,
    0,
  );
  // 12. Test maximum limit enforcement
  const maxLimitSearch =
    await api.functional.ecommerce.customer.password_resets.index(
      customerConnection,
      {
        body: {
          limit: 1000,
          page: 1,
        } satisfies IEcommerceCustomerPasswordReset.IRequest,
      },
    );
  typia.assert(maxLimitSearch);
  TestValidator.predicate(
    "max limit search has limit <= 1000",
    maxLimitSearch.pagination.limit <= 1000,
  );
  TestValidator.predicate(
    "max limit search data is array",
    Array.isArray(maxLimitSearch.data),
  );
}