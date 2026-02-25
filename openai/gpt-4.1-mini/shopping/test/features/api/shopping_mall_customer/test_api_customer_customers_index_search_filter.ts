import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_customers_index_search_filter(
  connection: api.IConnection,
): Promise<void> {
  // Scenario Description:
  // Test retrieving customer list filtered by partial matches on display name or email using the 'search' parameter.
  // Confirm the server correctly returns only matching customers.
  // Validate response pagination and that no sensitive fields are included.
  // Ensure authorization via customer join is enforced.
  // Verify combined search with pagination works as expected.
  // 1. Customer join and authorization
  const customerConnection: api.IConnection = { host: connection.host };
  const joinBody: IShoppingMallCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "TestPassword1234",
  };
  const authorized = await authorize_customer_join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);
  // Set auth header for customer connection
  customerConnection.headers = { Authorization: authorized.token.access };
  // 2. Prepare test data: create multiple customers with distinct emails via multiple joins
  const customerCount = 5;
  const customers: IShoppingMallCustomer.IAuthorized[] = [];
  for (let i = 0; i < customerCount; ++i) {
    const email = `testuser${i}@example.com`;
    const password = "TestPassword1234";
    const authorizedCustomer = await authorize_customer_join(connection, {
      body: { email, password },
    });
    typia.assert(authorizedCustomer);
    customers.push(authorizedCustomer);
  }
  // 3. Test search by partial email
  {
    const partialSearch = "testuser1"; // partial of testuser1@example.com
    const response = await api.functional.shoppingMall.customer.customers.index(
      customerConnection,
      { body: { search: partialSearch } },
    );
    typia.assert(response);
    // All returned customers' email or displayName should include partialSearch
    for (const cust of response.data) {
      const emailMatch = cust.email.includes(partialSearch);
      const displayNameMatch = (cust.displayName ?? "").includes(partialSearch);
      await TestValidator.predicate(
        `customer email or displayName match '${partialSearch}'`,
        emailMatch || displayNameMatch,
      );
    }
    // Validate pagination metadata
    await TestValidator.predicate(
      "pagination current page at least 1",
      response.pagination.current >= 1,
    );
    await TestValidator.predicate(
      "pagination limit is positive",
      response.pagination.limit > 0,
    );
    await TestValidator.predicate(
      "pagination pages count is non-negative",
      response.pagination.pages >= 0,
    );
    await TestValidator.predicate(
      "pagination records count is non-negative",
      response.pagination.records >= 0,
    );
    // Validate no sensitive fields like password_hash, token etc.
    for (const cust of response.data) {
      if ("password" in cust) {
        throw new Error(
          "Sensitive field 'password' should not be included in response",
        );
      }
      if ("token" in cust) {
        throw new Error(
          "Sensitive field 'token' should not be included in response",
        );
      }
    }
  }
  // 4. Test combined search with pagination
  {
    // Using a substring shared by multiple emails
    const sharedPartial = "testuser";
    const limit = 2;
    const page1 = await api.functional.shoppingMall.customer.customers.index(
      customerConnection,
      { body: { search: sharedPartial, page: 1, limit } },
    );
    typia.assert(page1);
    const page2 = await api.functional.shoppingMall.customer.customers.index(
      customerConnection,
      { body: { search: sharedPartial, page: 2, limit } },
    );
    typia.assert(page2);
    // Validate that page1 and page2 are disjoint sets
    for (const cust1 of page1.data) {
      for (const cust2 of page2.data) {
        await TestValidator.notEquals(
          "customer ids differ",
          cust1.id,
          cust2.id,
        );
      }
    }
    // Validate pagination fields
    await TestValidator.equals(
      "page1 current page",
      page1.pagination.current,
      1,
    );
    await TestValidator.equals(
      "page2 current page",
      page2.pagination.current,
      2,
    );
    await TestValidator.predicate(
      "page1 limit equals requested",
      page1.pagination.limit === limit,
    );
    await TestValidator.predicate(
      "page2 limit equals requested",
      page2.pagination.limit === limit,
    );
  }
  // 5. Test unauthorized access: base connection without auth should error
  await TestValidator.error("access denied without auth", async () => {
    await api.functional.shoppingMall.customer.customers.index(connection, {
      body: { search: "abc" },
    });
  });
}
