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
 * Test email pattern filtering for super administrator list retrieval.
 *
 * Validates the complete email search workflow including creating multiple super administrator accounts with distinct email patterns, authenticating as a super administrator, and performing partial email matching searches. Ensures that the search performs case-insensitive partial matching on email addresses and returns only matching accounts.
 *
 * Special attention is given to verifying that pagination metadata correctly reflects the filtered result set rather than total accounts, and that non-matching accounts are properly excluded from the data array.
 *
 * 1. Create multiple super administrator accounts with different email patterns.
 * 2. Use the authentication token from one of the created accounts for list access.
 * 3. Search using a partial email pattern that matches some accounts.
 * 4. Validate only matching accounts are returned in the data array.
 * 5. Verify pagination metadata is correctly calculated based on filtered results.
 * 6. Test case-insensitive matching with different case variations.
 */
export async function test_api_super_admin_list_email_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create multiple super admin accounts with different email patterns
  const baseEmail = RandomGenerator.alphabets(8).toLowerCase();
  const email1 = `test.${baseEmail}.admin1@example.com`;
  const email2 = `test.${baseEmail}.admin2@example.com`;
  const email3 = `test.${baseEmail}.user@example.com`;
  const email4 = `different.${RandomGenerator.alphabets(6)}@example.com`;
  // Create first super admin and get auth token
  const superAdmin1Connection: api.IConnection = { host: connection.host };
  const auth1 = await authorize_super_admin_join(superAdmin1Connection, {
    body: {
      email: email1,
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  typia.assert(auth1);
  // Create second super admin
  const superAdmin2Connection: api.IConnection = { host: connection.host };
  const auth2 = await authorize_super_admin_join(superAdmin2Connection, {
    body: {
      email: email2,
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  typia.assert(auth2);
  // Create third super admin
  const superAdmin3Connection: api.IConnection = { host: connection.host };
  const auth3 = await authorize_super_admin_join(superAdmin3Connection, {
    body: {
      email: email3,
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  typia.assert(auth3);
  // Create fourth super admin with different pattern (should not match)
  const superAdmin4Connection: api.IConnection = { host: connection.host };
  const auth4 = await authorize_super_admin_join(superAdmin4Connection, {
    body: {
      email: email4,
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  typia.assert(auth4);
  // 2. Set up connection with auth token from first super admin
  const searchConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: auth1.token.access,
    },
  };
  // 3. Search using partial email pattern that matches first 3 accounts
  const searchPattern = baseEmail;
  const result =
    await api.functional.shoppingMall.superAdmin.super_admins.index(
      searchConnection,
      {
        body: {
          search: searchPattern,
          page: 1,
          limit: 20,
          sort: "email",
          direction: "asc",
        } satisfies IShoppingMallSuperAdmin.IRequest,
      },
    );
  typia.assert(result);
  // 4. Validate only matching accounts are returned (should be 3, not 4)
  TestValidator.predicate(
    "should return only matching accounts",
    () => result.data.length === 3,
  );
  // Verify all returned accounts contain the search pattern in email
  for (const admin of result.data) {
    TestValidator.predicate(
      `email ${admin.email} should contain pattern ${searchPattern}`,
      () => admin.email.toLowerCase().includes(searchPattern.toLowerCase()),
    );
  }
  // Verify the non-matching account is excluded
  const hasNonMatching = result.data.some((admin) => admin.email === email4);
  TestValidator.predicate(
    "should exclude non-matching account",
    () => !hasNonMatching,
  );
  // 5. Verify pagination metadata is correctly calculated
  TestValidator.equals("current page", result.pagination.current, 1);
  TestValidator.equals("limit", result.pagination.limit, 20);
  TestValidator.equals(
    "total records should match filtered count",
    result.pagination.records,
    3,
  );
  TestValidator.equals("total pages", result.pagination.pages, 1);
  // 6. Test case-insensitive matching with uppercase pattern
  const uppercaseResult =
    await api.functional.shoppingMall.superAdmin.super_admins.index(
      searchConnection,
      {
        body: {
          search: searchPattern.toUpperCase(),
          page: 1,
          limit: 20,
          sort: "email",
          direction: "asc",
        } satisfies IShoppingMallSuperAdmin.IRequest,
      },
    );
  typia.assert(uppercaseResult);
  // Should return same 3 accounts (case-insensitive)
  TestValidator.equals(
    "case-insensitive search count",
    uppercaseResult.data.length,
    3,
  );
  // 7. Test with pattern that matches no accounts
  const noMatchResult =
    await api.functional.shoppingMall.superAdmin.super_admins.index(
      searchConnection,
      {
        body: {
          search: "nonexistent_pattern_xyz",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallSuperAdmin.IRequest,
      },
    );
  typia.assert(noMatchResult);
  TestValidator.equals(
    "no match search returns empty array",
    noMatchResult.data.length,
    0,
  );
  TestValidator.equals(
    "no match pagination records",
    noMatchResult.pagination.records,
    0,
  );
}
