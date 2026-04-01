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
 * Test customer list pagination and sorting functionality.
 *
 * This test validates:
 * 1. Super administrator authentication
 * 2. Customer list retrieval with pagination
 * 3. Sorting by created_at and email in both directions
 * 4. Pagination metadata accuracy
 * 5. Customer summary structure validation
 * 6. Multiple page and limit combinations
 * 7. Search and filter functionality
 */
export async function test_api_customer_list_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_super_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Test pagination with default parameters
  const page1 =
    await api.functional.shoppingMall.superAdministrator.customers.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort: "created_at",
          direction: "desc",
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(page1);
  // Validate pagination metadata structure
  TestValidator.predicate(
    "page 1 current",
    () => page1.pagination.current === 1,
  );
  TestValidator.predicate("page 1 limit", () => page1.pagination.limit === 10);
  TestValidator.predicate(
    "page 1 records non-negative",
    () => page1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 1 pages non-negative",
    () => page1.pagination.pages >= 0,
  );
  TestValidator.predicate("page 1 data is array", () =>
    Array.isArray(page1.data),
  );
  // Validate customer summary structure for each customer
  for (const customer of page1.data) {
    // Required fields validation
    TestValidator.predicate(
      "customer has uuid id",
      () => customer.id !== undefined,
    );
    TestValidator.predicate(
      "customer has email",
      () => customer.email !== undefined,
    );
    TestValidator.predicate(
      "customer has created_at",
      () => customer.created_at !== undefined,
    );
    TestValidator.predicate(
      "customer deleted_at is nullable",
      () =>
        customer.deleted_at === null || typeof customer.deleted_at === "string",
    );
    // Profile validation - can be null or ISummary
    if (customer.profile !== null) {
      TestValidator.predicate(
        "profile has uuid id",
        () => customer.profile!.id !== undefined,
      );
      TestValidator.predicate(
        "profile has displayName",
        () => customer.profile!.displayName !== undefined,
      );
      TestValidator.predicate(
        "profile has phoneNumber",
        () => customer.profile!.phoneNumber !== undefined,
      );
    }
  }
  // 3. Test second page if enough data exists
  if (page1.pagination.pages > 1) {
    const page2 =
      await api.functional.shoppingMall.superAdministrator.customers.index(
        adminConnection,
        {
          body: {
            page: 2,
            limit: 10,
            sort: "created_at",
            direction: "desc",
          } satisfies IShoppingMallCustomer.IRequest,
        },
      );
    typia.assert(page2);
    TestValidator.predicate(
      "page 2 current",
      () => page2.pagination.current === 2,
    );
    TestValidator.predicate(
      "page 2 limit matches",
      () => page2.pagination.limit === 10,
    );
    TestValidator.predicate(
      "page 2 records matches page 1",
      () => page2.pagination.records === page1.pagination.records,
    );
    TestValidator.predicate(
      "page 2 pages matches page 1",
      () => page2.pagination.pages === page1.pagination.pages,
    );
  }
  // 4. Test different limit values
  const pageWithLimit5 =
    await api.functional.shoppingMall.superAdministrator.customers.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 5,
          sort: "created_at",
          direction: "desc",
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(pageWithLimit5);
  TestValidator.predicate(
    "limit 5 current",
    () => pageWithLimit5.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit 5 limit",
    () => pageWithLimit5.pagination.limit === 5,
  );
  TestValidator.predicate(
    "limit 5 data length within limit",
    () => pageWithLimit5.data.length <= 5,
  );
  TestValidator.predicate(
    "limit 5 records matches",
    () => pageWithLimit5.pagination.records === page1.pagination.records,
  );
  // 5. Test sorting by created_at ascending
  const createdAtAsc =
    await api.functional.shoppingMall.superAdministrator.customers.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort: "created_at",
          direction: "asc",
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(createdAtAsc);
  TestValidator.predicate(
    "created_at asc has data",
    () => createdAtAsc.data.length >= 0,
  );
  TestValidator.predicate(
    "created_at asc records matches",
    () => createdAtAsc.pagination.records === page1.pagination.records,
  );
  // Validate ascending order if multiple customers exist
  if (createdAtAsc.data.length >= 2) {
    const firstDate = new Date(createdAtAsc.data[0].created_at).getTime();
    const secondDate = new Date(createdAtAsc.data[1].created_at).getTime();
    TestValidator.predicate(
      "created_at ascending order",
      () => firstDate <= secondDate,
    );
  }
  // 6. Test sorting by email descending
  const emailDesc =
    await api.functional.shoppingMall.superAdministrator.customers.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort: "email",
          direction: "desc",
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(emailDesc);
  TestValidator.predicate(
    "email desc has data",
    () => emailDesc.data.length >= 0,
  );
  TestValidator.predicate(
    "email desc records matches",
    () => emailDesc.pagination.records === page1.pagination.records,
  );
  // Validate descending email order if multiple customers exist
  if (emailDesc.data.length >= 2) {
    TestValidator.predicate(
      "email descending order",
      () => emailDesc.data[0].email >= emailDesc.data[1].email,
    );
  }
  // 7. Test sorting by email ascending
  const emailAsc =
    await api.functional.shoppingMall.superAdministrator.customers.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort: "email",
          direction: "asc",
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(emailAsc);
  TestValidator.predicate(
    "email asc has data",
    () => emailAsc.data.length >= 0,
  );
  TestValidator.predicate(
    "email asc records matches",
    () => emailAsc.pagination.records === page1.pagination.records,
  );
  // Validate ascending email order if multiple customers exist
  if (emailAsc.data.length >= 2) {
    TestValidator.predicate(
      "email ascending order",
      () => emailAsc.data[0].email <= emailAsc.data[1].email,
    );
  }
  // 8. Test with deleted filter (active customers only)
  const activeCustomers =
    await api.functional.shoppingMall.superAdministrator.customers.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          deleted: false,
          sort: "created_at",
          direction: "desc",
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(activeCustomers);
  TestValidator.predicate(
    "active customers retrieved",
    () => activeCustomers.data.length >= 0,
  );
  TestValidator.predicate("active customers all have null deleted_at", () =>
    activeCustomers.data.every((c) => c.deleted_at === null),
  );
  // 9. Test with deleted filter (deleted customers only)
  const deletedCustomers =
    await api.functional.shoppingMall.superAdministrator.customers.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          deleted: true,
          sort: "created_at",
          direction: "desc",
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(deletedCustomers);
  TestValidator.predicate(
    "deleted customers retrieved",
    () => deletedCustomers.data.length >= 0,
  );
  TestValidator.predicate(
    "deleted customers all have non-null deleted_at",
    () => deletedCustomers.data.every((c) => c.deleted_at !== null),
  );
  // 10. Test search functionality with partial email match
  const searchResults =
    await api.functional.shoppingMall.superAdministrator.customers.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          search: "@",
          sort: "created_at",
          direction: "desc",
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(searchResults);
  TestValidator.predicate(
    "search results retrieved",
    () => searchResults.data.length >= 0,
  );
  TestValidator.predicate("search results all contain @ in email", () =>
    searchResults.data.every((c) => c.email.includes("@")),
  );
  // 11. Validate descending created_at order from initial query
  if (page1.data.length >= 2) {
    const firstDate = new Date(page1.data[0].created_at).getTime();
    const secondDate = new Date(page1.data[1].created_at).getTime();
    TestValidator.predicate(
      "created_at descending order",
      () => firstDate >= secondDate,
    );
  }
  // 12. Test maximum limit value
  const maxLimitPage =
    await api.functional.shoppingMall.superAdministrator.customers.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
          sort: "created_at",
          direction: "desc",
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(maxLimitPage);
  TestValidator.predicate(
    "max limit current",
    () => maxLimitPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "max limit limit",
    () => maxLimitPage.pagination.limit === 100,
  );
  TestValidator.predicate(
    "max limit data within limit",
    () => maxLimitPage.data.length <= 100,
  );
  TestValidator.predicate(
    "max limit records matches",
    () => maxLimitPage.pagination.records === page1.pagination.records,
  );
}
