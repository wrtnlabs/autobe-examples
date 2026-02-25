import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customers_pagination_search(
  connection: api.IConnection,
): Promise<void> {
  // Create customer-specific connection for customer creation
  const customerConnections: api.IConnection[] = [];
  const customers: IEcommerceCustomer.IAuthorized[] = [];
  // Generate at least 30 customers to exceed default pagination limit
  for (let i = 0; i < 30; i++) {
    const customerConnection: api.IConnection = { host: connection.host };
    customerConnections.push(customerConnection);
    const customer = await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
      },
    });
    typia.assert(customer);
    customers.push(customer);
  }
  // Create a clean connection for search operations
  const searchConnection: api.IConnection = { host: connection.host };
  // Test 1: Initial search without filters to get all customers
  const firstSearch = await api.functional.ecommerce.customers.index(
    searchConnection,
    {
      body: {} satisfies IEcommerceCustomer.IRequest,
    },
  );
  typia.assert(firstSearch);
  // Verify pagination metadata structure
  TestValidator.equals(
    "pagination has current page",
    typeof firstSearch.pagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination has limit",
    typeof firstSearch.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "pagination has total records",
    typeof firstSearch.pagination.records,
    "number",
  );
  TestValidator.equals(
    "pagination has total pages",
    typeof firstSearch.pagination.pages,
    "number",
  );
  // Validate pagination calculations
  TestValidator.predicate(
    "total records at least created customers",
    firstSearch.pagination.records >= 30,
  );
  TestValidator.predicate(
    "limit is positive",
    firstSearch.pagination.limit > 0,
  );
  TestValidator.predicate(
    "current page defaults to 1",
    firstSearch.pagination.current === 1,
  );
  // Calculate expected pages
  const expectedPages = Math.ceil(
    firstSearch.pagination.records / firstSearch.pagination.limit,
  );
  TestValidator.equals(
    "total pages calculated correctly",
    firstSearch.pagination.pages,
    expectedPages,
  );
  // Test 2: Verify customer summary structure (typia.assert already validates)
  // All customer summaries are validated by typia.assert above
  // Test 3: Page navigation tests
  const testLimit = 10;
  // Get first page with explicit limit
  const page1 = await api.functional.ecommerce.customers.index(
    searchConnection,
    {
      body: {
        page: 1,
        limit: testLimit,
      } satisfies IEcommerceCustomer.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals(
    "page 1 has correct current page",
    page1.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 has requested limit",
    page1.pagination.limit,
    testLimit,
  );
  TestValidator.predicate(
    "page 1 data count ≤ limit",
    page1.data.length <= testLimit,
  );
  // Get second page
  const page2 = await api.functional.ecommerce.customers.index(
    searchConnection,
    {
      body: {
        page: 2,
        limit: testLimit,
      } satisfies IEcommerceCustomer.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals(
    "page 2 has correct current page",
    page2.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 has requested limit",
    page2.pagination.limit,
    testLimit,
  );
  TestValidator.predicate(
    "page 2 data count ≤ limit",
    page2.data.length <= testLimit,
  );
  // Ensure no overlap between page 1 and page 2
  const page1Ids = new Set(page1.data.map((item) => item.id));
  const page2Ids = new Set(page2.data.map((item) => item.id));
  for (const id of page2Ids) {
    TestValidator.predicate("page 2 IDs not in page 1", !page1Ids.has(id));
  }
  // Test 4: Test with page number too high (should return empty data or last page)
  const highPage = await api.functional.ecommerce.customers.index(
    searchConnection,
    {
      body: {
        page: firstSearch.pagination.pages + 10,
        limit: testLimit,
      } satisfies IEcommerceCustomer.IRequest,
    },
  );
  typia.assert(highPage);
  // Should either return last page or empty data
  TestValidator.predicate(
    "page beyond total pages returns empty or last page",
    highPage.data.length === 0 ||
      highPage.pagination.current <= firstSearch.pagination.pages,
  );
  // Test 5: Test with different limit values
  const smallLimit = 5;
  const largeLimit = 20;
  const smallLimitResult = await api.functional.ecommerce.customers.index(
    searchConnection,
    {
      body: {
        limit: smallLimit,
      } satisfies IEcommerceCustomer.IRequest,
    },
  );
  typia.assert(smallLimitResult);
  TestValidator.equals(
    "small limit respected",
    smallLimitResult.pagination.limit,
    smallLimit,
  );
  TestValidator.predicate(
    "small limit data count ≤ limit",
    smallLimitResult.data.length <= smallLimit,
  );
  const largeLimitResult = await api.functional.ecommerce.customers.index(
    searchConnection,
    {
      body: {
        limit: largeLimit,
      } satisfies IEcommerceCustomer.IRequest,
    },
  );
  typia.assert(largeLimitResult);
  TestValidator.equals(
    "large limit respected",
    largeLimitResult.pagination.limit,
    largeLimit,
  );
  TestValidator.predicate(
    "large limit data count ≤ limit",
    largeLimitResult.data.length <= largeLimit,
  );
  // Test 6: Verify total consistency across searches
  TestValidator.equals(
    "total records consistent across searches",
    firstSearch.pagination.records,
    page1.pagination.records,
  );
  TestValidator.equals(
    "total records consistent with page 2",
    firstSearch.pagination.records,
    page2.pagination.records,
  );
  // Test 7: Test last page has correct count
  if (firstSearch.pagination.pages > 1) {
    const lastPage = await api.functional.ecommerce.customers.index(
      searchConnection,
      {
        body: {
          page: firstSearch.pagination.pages,
          limit: firstSearch.pagination.limit,
        } satisfies IEcommerceCustomer.IRequest,
      },
    );
    typia.assert(lastPage);
    TestValidator.equals(
      "last page shows correct current page",
      lastPage.pagination.current,
      firstSearch.pagination.pages,
    );
    // Last page should have ≤ limit items
    TestValidator.predicate(
      "last page data count ≤ limit",
      lastPage.data.length <= firstSearch.pagination.limit,
    );
    // Last page should not be empty if there are records
    if (firstSearch.pagination.records > 0) {
      TestValidator.predicate(
        "last page not empty if records exist",
        lastPage.data.length > 0,
      );
    }
  }
}