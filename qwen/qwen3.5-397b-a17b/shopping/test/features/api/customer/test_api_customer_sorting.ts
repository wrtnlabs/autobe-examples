import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test administrator customer listing with sorting capabilities.
 *
 * This test validates that administrators can sort customer lists by different
 * fields (created_at, email) and directions (asc, desc). The test creates multiple
 * customer accounts and verifies the sorting order matches expectations.
 */
export async function test_api_customer_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  // 2. Create multiple customer accounts with distinct emails for sorting tests
  const customerEmails: string[] = [];
  const customerConnections: api.IConnection[] = [];
  // Create 5 customers with predictable email patterns for sorting validation
  const customerData = [
    { email: "alice@testmail.com", password: "Password123!" },
    { email: "bob@testmail.com", password: "Password123!" },
    { email: "charlie@testmail.com", password: "Password123!" },
    { email: "david@testmail.com", password: "Password123!" },
    { email: "eve@testmail.com", password: "Password123!" },
  ];
  for (const customerInfo of customerData) {
    const customerConnection: api.IConnection = { host: connection.host };
    const customer = await authorize_customer_join(customerConnection, {
      body: {
        email: customerInfo.email,
        password: customerInfo.password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallCustomer.IJoin,
    });
    typia.assert(customer);
    customerEmails.push(customer.email);
    customerConnections.push(customerConnection);
    // Small delay to ensure distinct created_at timestamps
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  // 3. Test sorting by created_at descending (newest first)
  const createdDescResult =
    await api.functional.shoppingMall.administrator.customers.index(
      adminConnection,
      {
        body: {
          sort: "created_at",
          direction: "desc",
          limit: 10,
          page: 1,
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(createdDescResult);
  TestValidator.predicate("has customers", createdDescResult.data.length >= 5);
  // Verify newest customers appear first (our test customers should be at the top)
  const createdDescEmails = createdDescResult.data.map((c) => c.email);
  const ourCustomersInDescOrder = customerEmails.filter((email) =>
    createdDescEmails.includes(email),
  );
  // Eve should be first (newest), then David, Charlie, Bob, Alice
  TestValidator.equals(
    "newest customer first in desc order",
    ourCustomersInDescOrder[0],
    "eve@testmail.com",
  );
  // 4. Test sorting by created_at ascending (oldest first)
  const createdAscResult =
    await api.functional.shoppingMall.administrator.customers.index(
      adminConnection,
      {
        body: {
          sort: "created_at",
          direction: "asc",
          limit: 10,
          page: 1,
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(createdAscResult);
  const createdAscEmails = createdAscResult.data.map((c) => c.email);
  const ourCustomersInAscOrder = customerEmails.filter((email) =>
    createdAscEmails.includes(email),
  );
  // Alice should be first (oldest), then Bob, Charlie, David, Eve
  TestValidator.equals(
    "oldest customer first in asc order",
    ourCustomersInAscOrder[0],
    "alice@testmail.com",
  );
  // 5. Test sorting by email ascending (alphabetical A-Z)
  const emailAscResult =
    await api.functional.shoppingMall.administrator.customers.index(
      adminConnection,
      {
        body: {
          sort: "email",
          direction: "asc",
          limit: 10,
          page: 1,
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(emailAscResult);
  const emailAscEmails = emailAscResult.data.map((c) => c.email);
  const ourCustomersInEmailAscOrder = customerEmails.filter((email) =>
    emailAscEmails.includes(email),
  );
  // Should be alphabetical: alice, bob, charlie, david, eve
  TestValidator.equals(
    "emails sorted alphabetically ascending",
    ourCustomersInEmailAscOrder,
    [
      "alice@testmail.com",
      "bob@testmail.com",
      "charlie@testmail.com",
      "david@testmail.com",
      "eve@testmail.com",
    ],
  );
  // 6. Test sorting by email descending (alphabetical Z-A)
  const emailDescResult =
    await api.functional.shoppingMall.administrator.customers.index(
      adminConnection,
      {
        body: {
          sort: "email",
          direction: "desc",
          limit: 10,
          page: 1,
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(emailDescResult);
  const emailDescEmails = emailDescResult.data.map((c) => c.email);
  const ourCustomersInEmailDescOrder = customerEmails.filter((email) =>
    emailDescEmails.includes(email),
  );
  // Should be reverse alphabetical: eve, david, charlie, bob, alice
  TestValidator.equals(
    "emails sorted alphabetically descending",
    ourCustomersInEmailDescOrder,
    [
      "eve@testmail.com",
      "david@testmail.com",
      "charlie@testmail.com",
      "bob@testmail.com",
      "alice@testmail.com",
    ],
  );
  // 7. Test sorting with pagination
  const paginatedResult =
    await api.functional.shoppingMall.administrator.customers.index(
      adminConnection,
      {
        body: {
          sort: "email",
          direction: "asc",
          limit: 2,
          page: 1,
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.equals("page 1 has 2 items", paginatedResult.data.length, 2);
  TestValidator.equals(
    "page 1 first customer",
    paginatedResult.data[0]?.email,
    "alice@testmail.com",
  );
  TestValidator.equals(
    "page 1 second customer",
    paginatedResult.data[1]?.email,
    "bob@testmail.com",
  );
  // Verify pagination info
  TestValidator.predicate(
    "pagination exists",
    paginatedResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is 1",
    paginatedResult.pagination.current >= 1,
  );
  TestValidator.predicate("limit is 2", paginatedResult.pagination.limit === 2);
  TestValidator.predicate(
    "total records >= 5",
    paginatedResult.pagination.records >= 5,
  );
}
