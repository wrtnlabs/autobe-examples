import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSuperAdministrator";
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
 * Test the super administrator list endpoint with email search filtering.
 *
 * This test verifies:
 * 1. Email partial match search functionality
 * 2. Case-insensitive search behavior
 * 3. Pagination with search results
 * 4. Search with no matching results
 * 5. Search combined with sorting parameters
 */
export async function test_api_super_administrator_list_email_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create primary super administrator and authenticate
  const primaryAdminAuth = await authorize_super_administrator_join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(primaryAdminAuth);
  // Create authenticated connection for primary admin
  const primaryAdminConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${primaryAdminAuth.token.access}`,
    },
  };
  // 2. Create multiple super administrator accounts with different email patterns
  const adminEmails = [
    `admin_test1_${RandomGenerator.alphaNumeric(8)}@example.com`,
    `admin_test2_${RandomGenerator.alphaNumeric(8)}@example.com`,
    `admin_user_${RandomGenerator.alphaNumeric(8)}@example.com`,
    `user_example_${RandomGenerator.alphaNumeric(8)}@test.com`,
    `customer_${RandomGenerator.alphaNumeric(8)}@example.com`,
  ];
  const createdAdmins: IShoppingMallSuperAdministrator.IAuthorized[] = [];
  for (const email of adminEmails) {
    const adminAuth = await authorize_super_administrator_join(connection, {
      body: {
        email,
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
    typia.assert(adminAuth);
    createdAdmins.push(adminAuth);
  }
  // 3. Search for super administrators with partial email match 'admin'
  const adminSearchResult =
    await api.functional.shoppingMall.superAdministrator.super_administrators.index(
      primaryAdminConnection,
      {
        body: {
          search: "admin",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallSuperAdministrator.IRequest,
      },
    );
  typia.assert(adminSearchResult);
  // Verify all results contain 'admin' in email (case-insensitive)
  TestValidator.predicate("all results contain 'admin' in email", () =>
    adminSearchResult.data.every((admin) =>
      admin.email.toLowerCase().includes("admin"),
    ),
  );
  // Verify we got at least the 3 admin accounts we created
  TestValidator.predicate(
    "search returns at least 3 admin accounts",
    () => adminSearchResult.data.length >= 3,
  );
  // 4. Test case-insensitive search with uppercase 'ADMIN'
  const uppercaseSearchResult =
    await api.functional.shoppingMall.superAdministrator.super_administrators.index(
      primaryAdminConnection,
      {
        body: {
          search: "ADMIN",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallSuperAdministrator.IRequest,
      },
    );
  typia.assert(uppercaseSearchResult);
  // Verify uppercase search returns same results as lowercase
  TestValidator.equals(
    "case-insensitive search returns same count",
    uppercaseSearchResult.pagination.records,
    adminSearchResult.pagination.records,
  );
  // 5. Test pagination with search results
  const paginatedSearchResult =
    await api.functional.shoppingMall.superAdministrator.super_administrators.index(
      primaryAdminConnection,
      {
        body: {
          search: "admin",
          page: 1,
          limit: 2,
        } satisfies IShoppingMallSuperAdministrator.IRequest,
      },
    );
  typia.assert(paginatedSearchResult);
  TestValidator.predicate(
    "pagination limit respected",
    () => paginatedSearchResult.data.length <= 2,
  );
  TestValidator.equals(
    "pagination current page",
    paginatedSearchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    paginatedSearchResult.pagination.limit,
    2,
  );
  TestValidator.equals(
    "pagination pages calculated correctly",
    paginatedSearchResult.pagination.pages,
    Math.ceil(paginatedSearchResult.pagination.records / 2),
  );
  // 6. Test search with no matching results
  const noResultSearch =
    await api.functional.shoppingMall.superAdministrator.super_administrators.index(
      primaryAdminConnection,
      {
        body: {
          search: `nonexistent_${RandomGenerator.alphaNumeric(16)}`,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallSuperAdministrator.IRequest,
      },
    );
  typia.assert(noResultSearch);
  TestValidator.equals(
    "no results search returns empty data",
    noResultSearch.data.length,
    0,
  );
  TestValidator.equals(
    "no results search has zero records",
    noResultSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "no results search has zero pages",
    noResultSearch.pagination.pages,
    0,
  );
  // 7. Test search combined with sorting parameters
  const sortedSearchResult =
    await api.functional.shoppingMall.superAdministrator.super_administrators.index(
      primaryAdminConnection,
      {
        body: {
          search: "example.com",
          sort: "email",
          direction: "asc",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallSuperAdministrator.IRequest,
      },
    );
  typia.assert(sortedSearchResult);
  // Verify results are sorted by email ascending
  TestValidator.predicate("search results sorted by email ascending", () => {
    const emails = sortedSearchResult.data.map((admin) => admin.email);
    const sortedEmails = [...emails].sort();
    return JSON.stringify(emails) === JSON.stringify(sortedEmails);
  });
  // 8. Test search with descending sort
  const descSortedSearchResult =
    await api.functional.shoppingMall.superAdministrator.super_administrators.index(
      primaryAdminConnection,
      {
        body: {
          search: "example.com",
          sort: "created_at",
          direction: "desc",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallSuperAdministrator.IRequest,
      },
    );
  typia.assert(descSortedSearchResult);
  // Verify results are sorted by created_at descending
  TestValidator.predicate(
    "search results sorted by created_at descending",
    () => {
      const timestamps = descSortedSearchResult.data.map((admin) =>
        new Date(admin.created_at).getTime(),
      );
      for (let i = 1; i < timestamps.length; i++) {
        if (timestamps[i] > timestamps[i - 1]) {
          return false;
        }
      }
      return true;
    },
  );
  // 9. Verify specific admin emails can be found
  const specificAdminSearch =
    await api.functional.shoppingMall.superAdministrator.super_administrators.index(
      primaryAdminConnection,
      {
        body: {
          search: "admin_test1",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallSuperAdministrator.IRequest,
      },
    );
  typia.assert(specificAdminSearch);
  TestValidator.equals(
    "specific admin search returns 1 result",
    specificAdminSearch.data.length,
    1,
  );
  TestValidator.predicate("specific admin email matches", () =>
    specificAdminSearch.data[0].email.includes("admin_test1"),
  );
  // 10. Test search filtering with deleted status (should only show active by default)
  const activeOnlySearch =
    await api.functional.shoppingMall.superAdministrator.super_administrators.index(
      primaryAdminConnection,
      {
        body: {
          search: "admin",
          deleted: false,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallSuperAdministrator.IRequest,
      },
    );
  typia.assert(activeOnlySearch);
  TestValidator.predicate("active only search excludes deleted accounts", () =>
    activeOnlySearch.data.every((admin) => admin.deleted_at === null),
  );
}
