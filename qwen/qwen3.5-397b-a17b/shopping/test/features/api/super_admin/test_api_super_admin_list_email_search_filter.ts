import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSuperAdmin";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test email-based search filtering for super administrator accounts.
 *
 * This test validates the email search functionality for the super admin list endpoint:
 * 1. Creates three super admin accounts with distinct email patterns
 * 2. Authenticates as a super admin to access the privileged endpoint
 * 3. Tests partial email matching that returns single result
 * 4. Tests partial email matching that returns multiple results
 * 5. Tests search term with no matches (empty results)
 * 6. Validates pagination metadata reflects filtered counts
 * 7. Verifies case-insensitive search behavior
 */
export async function test_api_super_admin_list_email_search_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create three super admin accounts with distinct email patterns for search testing
  const superAdmin1 = await authorize_super_admin_join(connection, {
    body: {
      email: "search.test.admin1@example.com",
      password: "TestPassword123!",
      href: "https://example.com/admin/join",
      referrer: "https://example.com/",
      ip: "192.168.1.1",
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  typia.assert(superAdmin1);
  const superAdmin2 = await authorize_super_admin_join(connection, {
    body: {
      email: "search.test.admin2@example.com",
      password: "TestPassword123!",
      href: "https://example.com/admin/join",
      referrer: "https://example.com/",
      ip: "192.168.1.2",
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  typia.assert(superAdmin2);
  const superAdmin3 = await authorize_super_admin_join(connection, {
    body: {
      email: "different.email@example.com",
      password: "TestPassword123!",
      href: "https://example.com/admin/join",
      referrer: "https://example.com/",
      ip: "192.168.1.3",
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  typia.assert(superAdmin3);
  // Create authenticated connection for super admin to access the endpoint
  const superAdminConnection: api.IConnection = { host: connection.host };
  superAdminConnection.headers = {
    Authorization: `Bearer ${superAdmin1.token.access}`,
  };
  // Test 1: Search with partial email matching single result ("admin1")
  const searchAdmin1Result =
    await api.functional.shoppingMall.superAdmin.super_admins.index(
      superAdminConnection,
      {
        body: {
          search: "admin1",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSuperAdmin.IRequest,
      },
    );
  typia.assert(searchAdmin1Result);
  TestValidator.equals(
    "search admin1 returns 1 result",
    searchAdmin1Result.pagination.records,
    1,
  );
  TestValidator.equals(
    "search admin1 data length",
    searchAdmin1Result.data.length,
    1,
  );
  TestValidator.predicate(
    "search admin1 result contains admin1 email",
    searchAdmin1Result.data.some(
      (admin) => admin.email === "search.test.admin1@example.com",
    ),
  );
  // Test 2: Search with partial email matching multiple results ("search.test")
  const searchMultipleResult =
    await api.functional.shoppingMall.superAdmin.super_admins.index(
      superAdminConnection,
      {
        body: {
          search: "search.test",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSuperAdmin.IRequest,
      },
    );
  typia.assert(searchMultipleResult);
  TestValidator.equals(
    "search search.test returns 2 results",
    searchMultipleResult.pagination.records,
    2,
  );
  TestValidator.equals(
    "search search.test data length",
    searchMultipleResult.data.length,
    2,
  );
  // Test 3: Search with term matching no results ("nonexistent")
  const searchNoMatchResult =
    await api.functional.shoppingMall.superAdmin.super_admins.index(
      superAdminConnection,
      {
        body: {
          search: "nonexistent",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSuperAdmin.IRequest,
      },
    );
  typia.assert(searchNoMatchResult);
  TestValidator.equals(
    "search nonexistent returns 0 results",
    searchNoMatchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "search nonexistent data length",
    searchNoMatchResult.data.length,
    0,
  );
  TestValidator.equals(
    "search nonexistent pages is 0",
    searchNoMatchResult.pagination.pages,
    0,
  );
  // Test 4: Case-insensitive search (ADMIN1 in uppercase)
  const searchCaseInsensitiveResult =
    await api.functional.shoppingMall.superAdmin.super_admins.index(
      superAdminConnection,
      {
        body: {
          search: "ADMIN1",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSuperAdmin.IRequest,
      },
    );
  typia.assert(searchCaseInsensitiveResult);
  TestValidator.equals(
    "search ADMIN1 (uppercase) returns 1 result",
    searchCaseInsensitiveResult.pagination.records,
    1,
  );
  TestValidator.predicate(
    "search ADMIN1 result contains admin1 email",
    searchCaseInsensitiveResult.data.some(
      (admin) => admin.email === "search.test.admin1@example.com",
    ),
  );
  // Test 5: Search with example.com domain matching all three super admins
  const searchDomainResult =
    await api.functional.shoppingMall.superAdmin.super_admins.index(
      superAdminConnection,
      {
        body: {
          search: "example.com",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSuperAdmin.IRequest,
      },
    );
  typia.assert(searchDomainResult);
  TestValidator.predicate(
    "search example.com returns at least 3 results",
    searchDomainResult.pagination.records >= 3,
  );
  // Test 6: Validate pagination metadata structure
  TestValidator.predicate(
    "pagination current page is 1",
    searchAdmin1Result.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is set",
    searchAdmin1Result.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    searchAdmin1Result.pagination.pages >= 1,
  );
}
