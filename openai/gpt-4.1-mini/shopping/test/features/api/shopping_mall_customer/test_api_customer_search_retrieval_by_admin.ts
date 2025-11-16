import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Validate the functionality of an admin user searching and retrieving
 * customers.
 *
 * The test covers:
 *
 * - Admin user registration and authorization.
 * - Performing customer search with pagination, filters, and sorting.
 * - Validating response metadata for pagination and data correctness.
 * - Testing filtering by search keyword and status.
 * - Edge cases including empty result sets and pagination limits.
 */
export async function test_api_customer_search_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin registration and authentication
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: "Password123!",
    phone_number: null,
    role: "admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(adminAuthorized);

  // 2. Prepare base search request
  const baseRequest = {
    page: 1,
    limit: 10,
    search: null,
    status: null,
    sort_by: "created_at",
    order: "desc",
  } satisfies IShoppingMallCustomer.IRequest;

  // 3. Execute a customer search
  const firstPage: IPageIShoppingMallCustomer.ISummary =
    await api.functional.shoppingMall.admin.customers.index(connection, {
      body: baseRequest,
    });
  typia.assert(firstPage);

  // 4. Validate pagination fields
  TestValidator.predicate(
    "current page is 1",
    firstPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit per page is 10",
    firstPage.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pages is non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "total records is non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    firstPage.data.length <= 10,
  );

  // 5. Validate non-empty customers if any
  if (firstPage.data.length > 0) {
    for (const customer of firstPage.data) {
      typia.assert(customer);
      TestValidator.predicate(
        "customer id is non-empty string",
        typeof customer.id === "string" && customer.id.length > 0,
      );
      TestValidator.predicate(
        "customer email is non-empty string",
        typeof customer.email === "string" && customer.email.length > 0,
      );
      TestValidator.predicate(
        "customer name is non-empty string",
        typeof customer.name === "string" && customer.name.length > 0,
      );
      // Status can be null or string, no assertion here
    }
  }

  // 6. Test search filtering with a substring of a customer name
  if (firstPage.data.length > 0) {
    const keyword = firstPage.data[0].name.slice(0, 2);
    const searchRequest = {
      ...baseRequest,
      search: keyword,
      page: 1,
    } satisfies IShoppingMallCustomer.IRequest;

    const searchPage: IPageIShoppingMallCustomer.ISummary =
      await api.functional.shoppingMall.admin.customers.index(connection, {
        body: searchRequest,
      });
    typia.assert(searchPage);

    for (const customer of searchPage.data) {
      const matches =
        customer.name.includes(keyword) || customer.email.includes(keyword);
      TestValidator.predicate(
        `customer matches search keyword '${keyword}'`,
        matches,
      );
    }
  }

  // 7. Test filtering by status using the first customer's status if available
  if (firstPage.data.length > 0 && firstPage.data[0].status) {
    const statusFilter = firstPage.data[0].status;
    const statusRequest = {
      ...baseRequest,
      status: statusFilter,
      page: 1,
    } satisfies IShoppingMallCustomer.IRequest;

    const statusPage: IPageIShoppingMallCustomer.ISummary =
      await api.functional.shoppingMall.admin.customers.index(connection, {
        body: statusRequest,
      });
    typia.assert(statusPage);

    for (const customer of statusPage.data) {
      TestValidator.equals(
        `customer status is '${statusFilter}'`,
        customer.status,
        statusFilter,
      );
    }
  }

  // 8. Test pagination edge case: last page
  if (firstPage.pagination.pages > 1) {
    const lastPageRequest = {
      ...baseRequest,
      page: firstPage.pagination.pages,
    } satisfies IShoppingMallCustomer.IRequest;

    const lastPage: IPageIShoppingMallCustomer.ISummary =
      await api.functional.shoppingMall.admin.customers.index(connection, {
        body: lastPageRequest,
      });
    typia.assert(lastPage);

    TestValidator.predicate(
      "current page equals last page",
      lastPage.pagination.current === firstPage.pagination.pages,
    );

    TestValidator.predicate(
      "last page data count within limit",
      lastPage.data.length <= baseRequest.limit,
    );
  }

  // 9. Test maximum page limit enforcement
  const maxLimitRequest = {
    ...baseRequest,
    limit: 100,
  } satisfies IShoppingMallCustomer.IRequest;

  const maxLimitPage: IPageIShoppingMallCustomer.ISummary =
    await api.functional.shoppingMall.admin.customers.index(connection, {
      body: maxLimitRequest,
    });
  typia.assert(maxLimitPage);

  TestValidator.predicate(
    "max limit is enforced to 100",
    maxLimitPage.pagination.limit === 100,
  );
}
