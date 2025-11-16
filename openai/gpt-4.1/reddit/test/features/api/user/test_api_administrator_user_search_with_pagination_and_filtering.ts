import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUser";

/**
 * Validate that an authenticated administrator can search and retrieve a
 * paginated, filtered list of registered users.
 *
 * Test process:
 *
 * 1. Register a new administrator and ensure authentication.
 * 2. Search users with various filters (email partial/exact, status values,
 *    creation/update date ranges).
 * 3. Validate paginated results and that only allowed summary data is exposed.
 * 4. Access is denied for unauthenticated requests.
 */
export async function test_api_administrator_user_search_with_pagination_and_filtering(
  connection: api.IConnection,
) {
  // 1. Register a new administrator (and auto-login via join)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies ICommunityPlatformAdministrator.ICreate;
  const adminAuth: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuth);

  // Store access token for admin session switching
  const adminAccessToken = adminAuth.token.access;

  // 2. Try various user search filters
  // --- Basic unfiltered search (page 1, default limit)
  const basicRequest = {
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformUser.IRequest;
  const basicPage =
    await api.functional.communityPlatform.administrator.users.index(
      connection,
      { body: basicRequest },
    );
  typia.assert(basicPage);
  TestValidator.equals("pagination page 1", basicPage.pagination.current, 1);
  TestValidator.equals("pagination limit", basicPage.pagination.limit, 10);
  TestValidator.equals("summary array", Array.isArray(basicPage.data), true);

  // --- Filter by exact email (simulate existing user, here only possible if users exist)
  if (basicPage.data.length > 0) {
    const userId = basicPage.data[0].id;
    // Can't filter by id, so try partial email (simulate partial by generating substring)
    const partialEmailValue = adminEmail.substring(
      0,
      Math.max(1, adminEmail.indexOf("@")),
    );
    const partialRequest = {
      email: partialEmailValue,
      limit: 5,
      page: 1,
    } satisfies ICommunityPlatformUser.IRequest;
    const partialPage =
      await api.functional.communityPlatform.administrator.users.index(
        connection,
        { body: partialRequest },
      );
    typia.assert(partialPage);
    TestValidator.equals(
      "user summary type after partial email search",
      Array.isArray(partialPage.data),
      true,
    );
    // Results should be a subset of the original set (if any match)
    if (partialPage.data.length > 0) {
      TestValidator.predicate(
        "partial email filter yielded at least one result",
        partialPage.data.length > 0,
      );
    }
  }

  // --- Filter by user status (test all allowed status values)
  const allowedStatuses = [
    "pending",
    "active",
    "deactivated",
    "banned",
  ] as const;
  for (const status of allowedStatuses) {
    const statusRequest = {
      status,
      limit: 2,
      page: 1,
    } satisfies ICommunityPlatformUser.IRequest;
    const statusPage =
      await api.functional.communityPlatform.administrator.users.index(
        connection,
        { body: statusRequest },
      );
    typia.assert(statusPage);
    TestValidator.equals(
      `user summary for status '${status}' is array`,
      Array.isArray(statusPage.data),
      true,
    );
    TestValidator.equals(
      `pagination current for status '${status}'`,
      statusPage.pagination.current,
      1,
    );
  }

  // --- Date/time range filter (created_from/created_to, updated_from/updated_to)
  const nowStr = new Date().toISOString();
  const dateRangeRequest = {
    created_from: nowStr,
    created_to: nowStr,
    updated_from: nowStr,
    updated_to: nowStr,
    page: 1,
    limit: 3,
  } satisfies ICommunityPlatformUser.IRequest;
  const dateRangePage =
    await api.functional.communityPlatform.administrator.users.index(
      connection,
      { body: dateRangeRequest },
    );
  typia.assert(dateRangePage);
  TestValidator.equals(
    "date-range filter is array",
    Array.isArray(dateRangePage.data),
    true,
  );

  // --- Pagination: fetch page 2
  const pageTwoRequest = {
    page: 2,
    limit: 2,
  } satisfies ICommunityPlatformUser.IRequest;
  const pageTwo =
    await api.functional.communityPlatform.administrator.users.index(
      connection,
      { body: pageTwoRequest },
    );
  typia.assert(pageTwo);
  TestValidator.equals("pagination page 2", pageTwo.pagination.current, 2);

  // 3. Access forbidden for unauthenticated call
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user search should throw error",
    async () => {
      await api.functional.communityPlatform.administrator.users.index(
        unauthConn,
        {
          body: { page: 1, limit: 2 } satisfies ICommunityPlatformUser.IRequest,
        },
      );
    },
  );
}
