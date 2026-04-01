import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

/**
 * Test customer list search by email functionality.
 *
 * This test verifies the email search functionality for super administrators
 * to lookup customer accounts using partial email matching.
 *
 * Test scenarios:
 * 1. Authenticate as super administrator
 * 2. Search with partial email that matches multiple customers
 * 3. Search with partial email that matches a single customer
 * 4. Search with email that matches no customers (empty results)
 * 5. Verify pagination works correctly with search results
 * 6. Validate search results include complete customer summaries
 */
export async function test_api_customer_list_search_by_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdministrator.IJoin,
  });
  // 2. Search with partial email matching multiple customers
  // Use a common substring that would match multiple test customers
  const multiMatchSearch = "test";
  const multiMatchResult =
    await api.functional.shoppingMall.superAdministrator.customers.index(
      superAdminConnection,
      {
        body: {
          search: multiMatchSearch,
          page: 1,
          limit: 10,
          sort: "created_at",
          direction: "desc",
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(multiMatchResult);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination has current page",
    multiMatchResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    multiMatchResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    multiMatchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    multiMatchResult.pagination.pages >= 0,
  );
  // Validate data array exists
  TestValidator.predicate(
    "data array exists",
    Array.isArray(multiMatchResult.data),
  );
  // 3. Search with unique email substring matching single or no customers
  const uniqueSearch = RandomGenerator.alphabets(10);
  const uniqueResult =
    await api.functional.shoppingMall.superAdministrator.customers.index(
      superAdminConnection,
      {
        body: {
          search: uniqueSearch,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(uniqueResult);
  // Validate empty search results structure
  TestValidator.equals(
    "unique search returns empty data",
    uniqueResult.data,
    [],
  );
  TestValidator.equals(
    "unique search records is 0",
    uniqueResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "unique search pages is 0",
    uniqueResult.pagination.pages,
    0,
  );
  // 4. Test pagination with search results
  // Search with limit of 1 to test pagination
  const paginatedResult =
    await api.functional.shoppingMall.superAdministrator.customers.index(
      superAdminConnection,
      {
        body: {
          search: "test",
          page: 1,
          limit: 1,
          sort: "email",
          direction: "asc",
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(paginatedResult);
  // Validate pagination respects limit
  TestValidator.predicate(
    "paginated data respects limit",
    paginatedResult.data.length <= 1,
  );
  TestValidator.equals(
    "pagination limit is 1",
    paginatedResult.pagination.limit,
    1,
  );
  // 5. Validate customer summary structure in results
  if (multiMatchResult.data.length > 0) {
    const customer = multiMatchResult.data[0];
    // Validate required fields exist
    TestValidator.predicate("customer has id", customer.id !== undefined);
    TestValidator.predicate("customer has email", customer.email !== undefined);
    TestValidator.predicate(
      "customer has created_at",
      customer.created_at !== undefined,
    );
    TestValidator.predicate(
      "customer has deleted_at (can be null)",
      customer.deleted_at !== undefined,
    );
    // Validate email contains search term (case-insensitive partial match)
    TestValidator.predicate(
      "customer email contains search term",
      customer.email.toLowerCase().includes(multiMatchSearch.toLowerCase()),
    );
    // Validate profile structure if exists
    if (customer.profile !== null) {
      TestValidator.predicate(
        "profile has id",
        customer.profile.id !== undefined,
      );
      TestValidator.predicate(
        "profile has displayName",
        customer.profile.displayName !== undefined,
      );
      TestValidator.predicate(
        "profile has phoneNumber",
        customer.profile.phoneNumber !== undefined,
      );
    }
  }
  // 6. Test sorting by email
  const emailSortedResult =
    await api.functional.shoppingMall.superAdministrator.customers.index(
      superAdminConnection,
      {
        body: {
          search: "test",
          page: 1,
          limit: 10,
          sort: "email",
          direction: "asc",
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(emailSortedResult);
  // Validate emails are sorted ascending if multiple results
  if (emailSortedResult.data.length > 1) {
    for (let i = 1; i < emailSortedResult.data.length; i++) {
      TestValidator.predicate(
        "emails sorted ascending",
        emailSortedResult.data[i - 1].email.toLowerCase() <=
          emailSortedResult.data[i].email.toLowerCase(),
      );
    }
  }
  // 7. Test filtering by deleted status
  const activeCustomersResult =
    await api.functional.shoppingMall.superAdministrator.customers.index(
      superAdminConnection,
      {
        body: {
          search: "test",
          deleted: false,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(activeCustomersResult);
  // Validate all returned customers are active (deleted_at is null)
  for (const customer of activeCustomersResult.data) {
    TestValidator.equals(
      "active customer deleted_at is null",
      customer.deleted_at,
      null,
    );
  }
}
