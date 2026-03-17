import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
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
 * Test administrator customer list search and sort functionality.
 *
 * This test validates the customer management endpoint's search and sort capabilities:
 * 1. Creates admin account and authenticates
 * 2. Creates multiple customer accounts with varied data
 * 3. Tests email partial match filtering
 * 4. Tests nickname partial match filtering
 * 5. Tests created_at date range filtering
 * 6. Tests sorting by different fields in both directions
 * 7. Tests combined filters
 * 8. Validates pagination accuracy
 */
export async function test_api_customer_list_search_sort(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: "http://localhost:3000/admin/join",
      referrer: "http://localhost:3000/",
    },
  });
  typia.assert(adminJoin);
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminJoin.email,
      password: "TestPass123!",
    } satisfies IShoppingMallAdmin.ILogin,
  });
  // 2. Create multiple customer accounts with distinct data
  const customerEmails: string[] = [];
  const customerNicknames: string[] = [];
  const customerIds: string[] = [];
  // Customer 1: alice@example.com, "Alice Wonder"
  const customer1 = await authorize_customer_join(
    { host: connection.host },
    {
      body: {
        email: "alice@example.com",
        password: "CustomerPass123!",
        nickname: "Alice Wonder",
        phone_number: RandomGenerator.mobile(),
        href: "http://localhost:3000/customer/join",
        referrer: "http://localhost:3000/",
        ip: null,
      },
    },
  );
  typia.assert(customer1);
  customerEmails.push(customer1.email);
  customerNicknames.push(customer1.nickname);
  customerIds.push(customer1.id);
  // Customer 2: bob@example.com, "Bob Builder"
  const customer2 = await authorize_customer_join(
    { host: connection.host },
    {
      body: {
        email: "bob@example.com",
        password: "CustomerPass123!",
        nickname: "Bob Builder",
        phone_number: RandomGenerator.mobile(),
        href: "http://localhost:3000/customer/join",
        referrer: "http://localhost:3000/",
        ip: null,
      },
    },
  );
  typia.assert(customer2);
  customerEmails.push(customer2.email);
  customerNicknames.push(customer2.nickname);
  customerIds.push(customer2.id);
  // Customer 3: charlie@test.com, "Charlie Brown"
  const customer3 = await authorize_customer_join(
    { host: connection.host },
    {
      body: {
        email: "charlie@test.com",
        password: "CustomerPass123!",
        nickname: "Charlie Brown",
        phone_number: RandomGenerator.mobile(),
        href: "http://localhost:3000/customer/join",
        referrer: "http://localhost:3000/",
        ip: null,
      },
    },
  );
  typia.assert(customer3);
  customerEmails.push(customer3.email);
  customerNicknames.push(customer3.nickname);
  customerIds.push(customer3.id);
  // 3. Test email partial match filter - search by @example.com
  const emailFilterResult =
    await api.functional.shoppingMall.admin.customers.index(
      adminLoginConnection,
      {
        body: {
          email: "@example.com",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(emailFilterResult);
  TestValidator.predicate(
    "email filter returns only @example.com customers",
    emailFilterResult.data.every((c) => c.email.includes("@example.com")),
  );
  TestValidator.equals("email filter count", emailFilterResult.data.length, 2);
  // 4. Test nickname partial match filter - search for "li"
  const nicknameFilterResult =
    await api.functional.shoppingMall.admin.customers.index(
      adminLoginConnection,
      {
        body: {
          nickname: "li",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(nicknameFilterResult);
  TestValidator.predicate(
    "nickname filter returns matching customers",
    nicknameFilterResult.data.every((c) =>
      c.nickname.toLowerCase().includes("li"),
    ),
  );
  // 5. Test created_at date range filtering
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dateRangeResult =
    await api.functional.shoppingMall.admin.customers.index(
      adminLoginConnection,
      {
        body: {
          created_at_from: yesterday.toISOString(),
          created_at_to: tomorrow.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  TestValidator.predicate(
    "date range filter returns customers within range",
    dateRangeResult.data.every(
      (c) =>
        new Date(c.created_at) >= yesterday &&
        new Date(c.created_at) <= tomorrow,
    ),
  );
  // 6. Test sorting by created_at ascending
  const sortCreatedAscResult =
    await api.functional.shoppingMall.admin.customers.index(
      adminLoginConnection,
      {
        body: {
          sort: "created_at,asc",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(sortCreatedAscResult);
  for (let i = 1; i < sortCreatedAscResult.data.length; i++) {
    TestValidator.predicate(
      `created_at asc order at index ${i}`,
      new Date(sortCreatedAscResult.data[i - 1].created_at) <=
        new Date(sortCreatedAscResult.data[i].created_at),
    );
  }
  // Test sorting by created_at descending
  const sortCreatedDescResult =
    await api.functional.shoppingMall.admin.customers.index(
      adminLoginConnection,
      {
        body: {
          sort: "created_at,desc",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(sortCreatedDescResult);
  for (let i = 1; i < sortCreatedDescResult.data.length; i++) {
    TestValidator.predicate(
      `created_at desc order at index ${i}`,
      new Date(sortCreatedDescResult.data[i - 1].created_at) >=
        new Date(sortCreatedDescResult.data[i].created_at),
    );
  }
  // Test sorting by email ascending
  const sortEmailAscResult =
    await api.functional.shoppingMall.admin.customers.index(
      adminLoginConnection,
      {
        body: {
          sort: "email,asc",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(sortEmailAscResult);
  for (let i = 1; i < sortEmailAscResult.data.length; i++) {
    TestValidator.predicate(
      `email asc order at index ${i}`,
      sortEmailAscResult.data[i - 1].email <= sortEmailAscResult.data[i].email,
    );
  }
  // Test sorting by nickname descending
  const sortNicknameDescResult =
    await api.functional.shoppingMall.admin.customers.index(
      adminLoginConnection,
      {
        body: {
          sort: "nickname,desc",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(sortNicknameDescResult);
  for (let i = 1; i < sortNicknameDescResult.data.length; i++) {
    TestValidator.predicate(
      `nickname desc order at index ${i}`,
      sortNicknameDescResult.data[i - 1].nickname >=
        sortNicknameDescResult.data[i].nickname,
    );
  }
  // 7. Test combined filters (email + date range + sort)
  const combinedFilterResult =
    await api.functional.shoppingMall.admin.customers.index(
      adminLoginConnection,
      {
        body: {
          email: "@example.com",
          created_at_from: yesterday.toISOString(),
          created_at_to: tomorrow.toISOString(),
          sort: "email,asc",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(combinedFilterResult);
  TestValidator.predicate(
    "combined filter - email matches",
    combinedFilterResult.data.every((c) => c.email.includes("@example.com")),
  );
  TestValidator.predicate(
    "combined filter - date range",
    combinedFilterResult.data.every(
      (c) =>
        new Date(c.created_at) >= yesterday &&
        new Date(c.created_at) <= tomorrow,
    ),
  );
  for (let i = 1; i < combinedFilterResult.data.length; i++) {
    TestValidator.predicate(
      `combined filter - email sort at index ${i}`,
      combinedFilterResult.data[i - 1].email <=
        combinedFilterResult.data[i].email,
    );
  }
  // 8. Test pagination with filtered results
  const paginationResult =
    await api.functional.shoppingMall.admin.customers.index(
      adminLoginConnection,
      {
        body: {
          email: "@example.com",
          page: 1,
          limit: 1,
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(paginationResult);
  TestValidator.equals(
    "pagination total records accurate",
    paginationResult.pagination.records,
    2,
  );
  TestValidator.equals(
    "pagination current page",
    paginationResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    paginationResult.pagination.limit,
    1,
  );
  TestValidator.equals(
    "pagination total pages",
    paginationResult.pagination.pages,
    2,
  );
  TestValidator.equals(
    "pagination data length",
    paginationResult.data.length,
    1,
  );
  // Test page 2 of pagination
  const paginationPage2Result =
    await api.functional.shoppingMall.admin.customers.index(
      adminLoginConnection,
      {
        body: {
          email: "@example.com",
          page: 2,
          limit: 1,
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(paginationPage2Result);
  TestValidator.equals(
    "pagination page 2 total records",
    paginationPage2Result.pagination.records,
    2,
  );
  TestValidator.equals(
    "pagination page 2 current",
    paginationPage2Result.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination page 2 data length",
    paginationPage2Result.data.length,
    1,
  );
  // Verify page 1 and page 2 have different customers
  TestValidator.notEquals(
    "pagination pages return different customers",
    paginationResult.data[0].id,
    paginationPage2Result.data[0].id,
  );
}
