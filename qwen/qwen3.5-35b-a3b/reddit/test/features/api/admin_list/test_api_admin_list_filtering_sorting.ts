import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformAdmin";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_list_filtering_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(16),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph(),
      avatar_url: typia.random<string & tags.Format<"uri">>() ?? null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Test 1: Filter by isActive=true
  const activeAdminsResponse =
    await api.functional.redditPlatform.admin.admins.index(adminConnection, {
      body: {
        isActive: true,
      } satisfies IRedditPlatformAdmin.IRequest,
    });
  typia.assert(activeAdminsResponse);
  TestValidator.equals(
    "active admins filter",
    activeAdminsResponse.pagination.records >= 1,
    true,
  );
  TestValidator.predicate(
    "all returned admins are active",
    activeAdminsResponse.data.every((admin) => admin.is_active === true),
  );
  // 3. Test 2: Filter by isActive=false
  const suspendedAdminsResponse =
    await api.functional.redditPlatform.admin.admins.index(adminConnection, {
      body: {
        isActive: false,
      } satisfies IRedditPlatformAdmin.IRequest,
    });
  typia.assert(suspendedAdminsResponse);
  TestValidator.equals(
    "suspended admins filter",
    suspendedAdminsResponse.pagination.records >= 1,
    true,
  );
  TestValidator.predicate(
    "all returned admins are suspended",
    suspendedAdminsResponse.data.every((admin) => admin.is_active === false),
  );
  // 4. Test 3: Username search (partial matching)
  const usernameSearchTerm = RandomGenerator.alphaNumeric(8);
  const usernameSearchResponse =
    await api.functional.redditPlatform.admin.admins.index(adminConnection, {
      body: {
        usernameSearch: usernameSearchTerm,
      } satisfies IRedditPlatformAdmin.IRequest,
    });
  typia.assert(usernameSearchResponse);
  TestValidator.predicate(
    "username search returns results",
    usernameSearchResponse.data.length > 0 ||
      usernameSearchResponse.pagination.records === 0,
  );
  TestValidator.predicate(
    "all usernames contain search term",
    usernameSearchResponse.data.every((admin) =>
      admin.username.toLowerCase().includes(usernameSearchTerm.toLowerCase()),
    ),
  );
  // 5. Test 4: Email search (partial matching)
  const emailSearchTerm = typia
    .random<string & tags.Format<"email">>()
    .split("@")[0];
  const emailSearchResponse =
    await api.functional.redditPlatform.admin.admins.index(adminConnection, {
      body: {
        emailSearch: emailSearchTerm,
      } satisfies IRedditPlatformAdmin.IRequest,
    });
  typia.assert(emailSearchResponse);
  TestValidator.predicate(
    "email search returns results",
    emailSearchResponse.data.length > 0 ||
      emailSearchResponse.pagination.records === 0,
  );
  TestValidator.predicate(
    "all emails contain search term",
    emailSearchResponse.data.every((admin) =>
      admin.email.toLowerCase().includes(emailSearchTerm.toLowerCase()),
    ),
  );
  // 6. Test 5: Date range filter
  const now = new Date();
  const createdAfter = new Date(
    now.getTime() - 1000 * 60 * 60 * 24 * 7,
  ).toISOString(); // 7 days ago
  const createdBefore = new Date(
    now.getTime() - 1000 * 60 * 60 * 24 * 1,
  ).toISOString(); // 1 day ago
  const dateRangeResponse =
    await api.functional.redditPlatform.admin.admins.index(adminConnection, {
      body: {
        createdAfter,
        createdBefore,
      } satisfies IRedditPlatformAdmin.IRequest,
    });
  typia.assert(dateRangeResponse);
  TestValidator.predicate(
    "date range filter returns results",
    dateRangeResponse.data.length > 0 ||
      dateRangeResponse.pagination.records === 0,
  );
  TestValidator.predicate(
    "all admin dates within range",
    dateRangeResponse.data.every((admin) => {
      const adminDate = new Date(admin.created_at);
      return (
        adminDate > new Date(createdAfter) &&
        adminDate < new Date(createdBefore)
      );
    }),
  );
  // 7. Test 6: Sort by createdAt ascending
  const sortByCreatedAscResponse =
    await api.functional.redditPlatform.admin.admins.index(adminConnection, {
      body: {
        sortBy: "createdAt",
        sortOrder: "asc",
        limit: 10,
      } satisfies IRedditPlatformAdmin.IRequest,
    });
  typia.assert(sortByCreatedAscResponse);
  TestValidator.predicate(
    "createdAt ascending sorted",
    sortByCreatedAscResponse.data.length < 2 ||
      sortByCreatedAscResponse.data.every(
        (admin, i, arr) =>
          i === 0 ||
          new Date(arr[i - 1].created_at) <= new Date(admin.created_at),
      ),
  );
  // 8. Test 7: Sort by createdAt descending
  const sortByCreatedDescResponse =
    await api.functional.redditPlatform.admin.admins.index(adminConnection, {
      body: {
        sortBy: "createdAt",
        sortOrder: "desc",
        limit: 10,
      } satisfies IRedditPlatformAdmin.IRequest,
    });
  typia.assert(sortByCreatedDescResponse);
  TestValidator.predicate(
    "createdAt descending sorted",
    sortByCreatedDescResponse.data.length < 2 ||
      sortByCreatedDescResponse.data.every(
        (admin, i, arr) =>
          i === 0 ||
          new Date(arr[i - 1].created_at) >= new Date(admin.created_at),
      ),
  );
  // 9. Test 8: Sort by username
  const sortByUsernameResponse =
    await api.functional.redditPlatform.admin.admins.index(adminConnection, {
      body: {
        sortBy: "username",
        sortOrder: "asc",
        limit: 10,
      } satisfies IRedditPlatformAdmin.IRequest,
    });
  typia.assert(sortByUsernameResponse);
  TestValidator.predicate(
    "username alphabetical sorted",
    sortByUsernameResponse.data.length < 2 ||
      sortByUsernameResponse.data.every(
        (admin, i, arr) =>
          i === 0 || arr[i - 1].username.localeCompare(admin.username) <= 0,
      ),
  );
  // 10. Test 9: Combine multiple filters
  const combinedFiltersResponse =
    await api.functional.redditPlatform.admin.admins.index(adminConnection, {
      body: {
        isActive: true,
        usernameSearch: usernameSearchTerm,
        limit: 20,
      } satisfies IRedditPlatformAdmin.IRequest,
    });
  typia.assert(combinedFiltersResponse);
  TestValidator.predicate(
    "combined filters work correctly",
    combinedFiltersResponse.data.every((admin) => {
      const isActiveMatch = admin.is_active === true;
      const usernameMatch = admin.username
        .toLowerCase()
        .includes(usernameSearchTerm.toLowerCase());
      return isActiveMatch && usernameMatch;
    }),
  );
  // 11. Verify pagination metadata accuracy
  TestValidator.predicate(
    "pagination current matches page",
    activeAdminsResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit within bounds",
    activeAdminsResponse.pagination.limit >= 1 &&
      activeAdminsResponse.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records is positive",
    activeAdminsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    activeAdminsResponse.pagination.pages ===
      Math.ceil(
        activeAdminsResponse.pagination.records /
          activeAdminsResponse.pagination.limit,
      ),
  );
}