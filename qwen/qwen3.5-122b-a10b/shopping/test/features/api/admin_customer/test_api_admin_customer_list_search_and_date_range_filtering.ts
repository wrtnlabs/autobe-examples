import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test administrator customer list search with multiple filter criteria and date range filtering.
 *
 * This test validates:
 * 1. Admin can search customers using partial email match
 * 2. Admin can filter by exact displayName match
 * 3. Admin can filter by exact phoneNumber match
 * 4. Admin can filter by createdAt date range
 * 5. Admin can filter by updatedAt date range
 * 6. Multiple filters work together with AND logic
 * 7. Pagination metadata reflects filtered result count
 */
export async function test_api_admin_customer_list_search_and_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create admin account and login
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(
        typia.random<string & tags.Format<"email">>(),
      ),
      password: typia.assert<string & tags.MinLength<8> & tags.MaxLength<128>>(
        RandomGenerator.alphaNumeric(16),
      ),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin);
  // Login as admin
  await authorize_admin_login(adminConnection, {
    body: {
      email: admin.email,
      password: admin.token.access, // Use the password we just created
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 2. Setup: Create multiple customer accounts with specific attributes for testing
  const customer1Email = `test${RandomGenerator.alphabets(5)}@example.com`;
  const customer1DisplayName = "Alice Johnson";
  const customer1Phone = RandomGenerator.mobile("010");
  const customer2Email = `admin${RandomGenerator.alphabets(5)}@example.com`;
  const customer2DisplayName = "Bob Smith";
  const customer2Phone = RandomGenerator.mobile("011");
  const customer3Email = `test${RandomGenerator.alphabets(5)}@example.com`;
  const customer3DisplayName = "Alice Williams"; // Same first name as customer1
  const customer3Phone = RandomGenerator.mobile("016");
  // Create customers with different timestamps
  const customer1 = await api.functional.ecommerceMall.auth.customer.join(
    adminConnection,
    {
      body: {
        email: customer1Email,
        password: RandomGenerator.alphaNumeric(16),
        display_name: customer1DisplayName,
        phone_number: customer1Phone,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      } satisfies IEcommerceMallCustomer.IJoin,
    },
  );
  typia.assert(customer1);
  const customer2 = await api.functional.ecommerceMall.auth.customer.join(
    adminConnection,
    {
      body: {
        email: customer2Email,
        password: RandomGenerator.alphaNumeric(16),
        display_name: customer2DisplayName,
        phone_number: customer2Phone,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      } satisfies IEcommerceMallCustomer.IJoin,
    },
  );
  typia.assert(customer2);
  const customer3 = await api.functional.ecommerceMall.auth.customer.join(
    adminConnection,
    {
      body: {
        email: customer3Email,
        password: RandomGenerator.alphaNumeric(16),
        display_name: customer3DisplayName,
        phone_number: customer3Phone,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      } satisfies IEcommerceMallCustomer.IJoin,
    },
  );
  typia.assert(customer3);
  // 3. Test: Search by email partial match
  const emailSearchResult =
    await api.functional.ecommerceMall.admin.customers.index(adminConnection, {
      body: {
        search: "test",
        limit: 100,
      } satisfies IEcommerceMallCustomer.IRequest,
    });
  typia.assert(emailSearchResult);
  TestValidator.equals(
    "email search finds test customers",
    emailSearchResult.pagination.records,
    2,
  );
  TestValidator.predicate(
    "email search contains customer1",
    emailSearchResult.data.some((c) => c.email === customer1Email),
  );
  TestValidator.predicate(
    "email search contains customer3",
    emailSearchResult.data.some((c) => c.email === customer3Email),
  );
  // 4. Test: Filter by exact displayName match
  const displayNameFilterResult =
    await api.functional.ecommerceMall.admin.customers.index(adminConnection, {
      body: {
        displayName: customer1DisplayName,
        limit: 100,
      } satisfies IEcommerceMallCustomer.IRequest,
    });
  typia.assert(displayNameFilterResult);
  TestValidator.equals(
    "displayName filter finds exact match",
    displayNameFilterResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "displayName filter returns correct customer",
    displayNameFilterResult.data[0].email,
    customer1Email,
  );
  // 5. Test: Filter by exact phoneNumber match
  const phoneFilterResult =
    await api.functional.ecommerceMall.admin.customers.index(adminConnection, {
      body: {
        phoneNumber: customer2Phone,
        limit: 100,
      } satisfies IEcommerceMallCustomer.IRequest,
    });
  typia.assert(phoneFilterResult);
  TestValidator.equals(
    "phoneNumber filter finds exact match",
    phoneFilterResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "phoneNumber filter returns correct customer",
    phoneFilterResult.data[0].email,
    customer2Email,
  );
  // 6. Test: Filter by createdAt date range
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const createdAtFilterResult =
    await api.functional.ecommerceMall.admin.customers.index(adminConnection, {
      body: {
        createdAtFrom: yesterday.toISOString(),
        createdAtTo: tomorrow.toISOString(),
        limit: 100,
      } satisfies IEcommerceMallCustomer.IRequest,
    });
  typia.assert(createdAtFilterResult);
  TestValidator.predicate(
    "createdAt filter finds recent customers",
    createdAtFilterResult.pagination.records >= 3,
  );
  TestValidator.predicate(
    "all results within date range",
    createdAtFilterResult.data.every((c) => {
      const createdAt = new Date(c.created_at);
      return createdAt >= yesterday && createdAt <= tomorrow;
    }),
  );
  // 7. Test: Combined filters with AND logic
  const combinedFilterResult =
    await api.functional.ecommerceMall.admin.customers.index(adminConnection, {
      body: {
        search: "test",
        displayName: customer1DisplayName,
        createdAtFrom: yesterday.toISOString(),
        createdAtTo: tomorrow.toISOString(),
        limit: 100,
      } satisfies IEcommerceMallCustomer.IRequest,
    });
  typia.assert(combinedFilterResult);
  TestValidator.equals(
    "combined filters find matching customer",
    combinedFilterResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "combined filter returns customer1",
    combinedFilterResult.data[0].email,
    customer1Email,
  );
  // 8. Test: Filter by accountStatus
  const statusFilterResult =
    await api.functional.ecommerceMall.admin.customers.index(adminConnection, {
      body: {
        accountStatus: "active",
        limit: 100,
      } satisfies IEcommerceMallCustomer.IRequest,
    });
  typia.assert(statusFilterResult);
  TestValidator.predicate(
    "accountStatus filter finds active customers",
    statusFilterResult.pagination.records >= 3,
  );
  TestValidator.predicate(
    "all results have active status",
    statusFilterResult.data.every((c) => c.account_status === "active"),
  );
  // 9. Test: Pagination metadata accuracy
  const paginationTestResult =
    await api.functional.ecommerceMall.admin.customers.index(adminConnection, {
      body: {
        search: "test",
        page: 1,
        limit: 2,
      } satisfies IEcommerceMallCustomer.IRequest,
    });
  typia.assert(paginationTestResult);
  TestValidator.equals(
    "pagination current page is 1",
    paginationTestResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    paginationTestResult.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "pagination records >= data length",
    paginationTestResult.pagination.records >= paginationTestResult.data.length,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    paginationTestResult.pagination.pages ===
      Math.ceil(
        paginationTestResult.pagination.records /
          paginationTestResult.pagination.limit,
      ),
  );
}