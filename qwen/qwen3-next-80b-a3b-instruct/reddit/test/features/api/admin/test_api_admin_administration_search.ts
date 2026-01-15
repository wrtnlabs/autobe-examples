import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAdmin";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_administration_search(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create authenticated admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin1@example.com",
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Create specific administrators with known characteristics for controlled testing
  // Admin 2: active role_level=3, created 2 days ago, logged in yesterday
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2Email = "admin2@example.com";
  const admin2CreatedAt = new Date(
    Date.now() - 2 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const admin2LastLoginAt = new Date(
    Date.now() - 24 * 60 * 60 * 1000,
  ).toISOString();
  await authorize_admin_join(admin2Connection, {
    body: {
      email: admin2Email,
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Admin 3: suspended role_level=5, created 1 week ago, never logged in
  const admin3Connection: api.IConnection = { host: connection.host };
  const admin3Email = "admin3@example.com";
  const admin3CreatedAt = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  await authorize_admin_join(admin3Connection, {
    body: {
      email: admin3Email,
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 3: Update Admin 2's status to active and role_level to 3 (simulated through system)
  // In a real system this would be done via a separate endpoint, but for E2E we assume
  // we can control the database state or have a special test endpoint
  // Since we don't have an update endpoint, we'll assume the system sets defaults and test on what exists
  // Step 4: Perform search with multiple filters that should match Admin 2 only
  const searchCriteria: ICommunityPlatformAdmin.IRequest = {
    page: 1,
    limit: 10,
    search: "admin2", // Will match admin2@example.com
    status: "active", // Admin 2 is active
    role_level: 3, // Admin 2 has role_level 3
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // Created after this date
    last_login_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // Last login after this date
  };
  // Step 5: Execute search
  const searchResult: IPageICommunityPlatformAdmin.ISummary =
    await api.functional.communityPlatform.admin.admins.index(adminConnection, {
      body: searchCriteria,
    });
  // Step 6: Validate overall structure with typia.assert (all type safety guaranteed)
  typia.assert(searchResult);
  // Step 7: Validate pagination metadata
  TestValidator.equals(
    "response pagination current page",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "response pagination limit",
    searchResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "response pagination total records",
    searchResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "response pagination pages",
    searchResult.pagination.pages,
    1,
  );
  // Step 8: Validate that exactly one admin is returned and it matches expected profile
  TestValidator.equals("search results count", searchResult.data.length, 1);
  const resultAdmin = searchResult.data[0];
  // Validate that returned admin matches admin2's details
  TestValidator.equals("search result email", resultAdmin.email, admin2Email);
  TestValidator.equals("search result role_level", resultAdmin.role_level, 3);
  TestValidator.equals("search result status", resultAdmin.status, "active");
  // Validate created_at and last_login_at are within expected ranges (relaxed for string comparison)
  TestValidator.predicate(
    "search result created_at is before or on 2 days ago",
    resultAdmin.created_at <= admin2CreatedAt,
  );
  TestValidator.predicate(
    "search result last_login_at is before or on yesterday",
    resultAdmin.last_login_at <= admin2LastLoginAt,
  );
  // Step 9: Test role_level filter only - should return admin2 (role_level=3) and admin3 (role_level=5)
  const roleLevelCriteria: ICommunityPlatformAdmin.IRequest = {
    page: 1,
    limit: 10,
    role_level: 3,
  };
  const roleLevelResult: IPageICommunityPlatformAdmin.ISummary =
    await api.functional.communityPlatform.admin.admins.index(adminConnection, {
      body: roleLevelCriteria,
    });
  typia.assert(roleLevelResult);
  TestValidator.equals(
    "role_level filter count",
    roleLevelResult.data.length,
    1,
  );
  TestValidator.equals(
    "role_level filter result",
    roleLevelResult.data[0].role_level,
    3,
  );
  // Step 10: Test status filter only - should return admin1 and admin2 (active users), admin3 is suspended
  const statusCriteria: ICommunityPlatformAdmin.IRequest = {
    page: 1,
    limit: 10,
    status: "active",
  };
  const statusResult: IPageICommunityPlatformAdmin.ISummary =
    await api.functional.communityPlatform.admin.admins.index(adminConnection, {
      body: statusCriteria,
    });
  typia.assert(statusResult);
  TestValidator.equals("status filter count", statusResult.data.length, 2);
  // Step 11: Test search term filter - email contains "admin"
  const searchTermCriteria: ICommunityPlatformAdmin.IRequest = {
    page: 1,
    limit: 10,
    search: "admin",
  };
  const searchTermResult: IPageICommunityPlatformAdmin.ISummary =
    await api.functional.communityPlatform.admin.admins.index(adminConnection, {
      body: searchTermCriteria,
    });
  typia.assert(searchTermResult);
  TestValidator.equals("search term count", searchTermResult.data.length, 3);
  // Step 12: Test pagination - get first two admins
  const paginationCriteria: ICommunityPlatformAdmin.IRequest = {
    page: 1,
    limit: 2,
  };
  const paginationResult1: IPageICommunityPlatformAdmin.ISummary =
    await api.functional.communityPlatform.admin.admins.index(adminConnection, {
      body: paginationCriteria,
    });
  typia.assert(paginationResult1);
  TestValidator.equals(
    "first page has 2 results",
    paginationResult1.data.length,
    2,
  );
  const paginationResult2: IPageICommunityPlatformAdmin.ISummary =
    await api.functional.communityPlatform.admin.admins.index(adminConnection, {
      body: {
        ...paginationCriteria,
        page: 2,
      },
    });
  typia.assert(paginationResult2);
  TestValidator.equals(
    "second page has 1 result",
    paginationResult2.data.length,
    1,
  );
  // Step 13: Validate we're not exposing sensitive information
  // All information we're extracting is from ISummary - no token, no auth - correct
  // The members of the admin objects are only ID, username, email, role_level, status, last_login_at, created_at
  // All are public information for admins, no sensitive data exposed
}
