import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsUserStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsUserStatus";
import type { ICommunityBbsUserStatusDateRange } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsUserStatusDateRange";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsUserStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsUserStatus";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_user_status_search(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin using authorize_admin_join
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: ICommunityBbsAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Retrieve all user status records to use as baseline data
  const allStatusesResponse =
    await api.functional.communityBbs.admin.users.status.index(
      adminConnection,
      {
        body: {} satisfies ICommunityBbsUserStatus.IRequest,
      },
    );
  typia.assert(allStatusesResponse);
  // Draw baseline data from real existing records (no creation)
  const allStatuses = allStatusesResponse.data;
  // Step 3: Test single status filtering
  const targetStatus = RandomGenerator.pick([
    "active",
    "suspended",
    "banned",
    "pending_verification",
  ] as const);
  const filteredByStatusResponse =
    await api.functional.communityBbs.admin.users.status.index(
      adminConnection,
      {
        body: {
          status: [targetStatus],
        } satisfies ICommunityBbsUserStatus.IRequest,
      },
    );
  typia.assert(filteredByStatusResponse);
  // Count records in baseline data matching target status
  const expectedCount = allStatuses.filter(
    (item) => item.status === targetStatus,
  ).length;
  TestValidator.equals(
    "status filtering returns correct count",
    filteredByStatusResponse.data.length,
    expectedCount,
  );
  // Validate all returned items have the expected status
  filteredByStatusResponse.data.forEach((item) => {
    TestValidator.equals(
      "every returned item has filtered status",
      item.status,
      targetStatus,
    );
  });
  // Step 4: Test date range filtering
  // Use oldest and newest date in baseline data for range
  if (allStatuses.length > 0) {
    const dates = allStatuses.map((item) => new Date(item.createdAt));
    const oldestDate = new Date(Math.min(...dates.map(d => d.getTime()))).toISOString();
    const newestDate = new Date(Math.max(...dates.map(d => d.getTime()))).toISOString();
    const dateRange = {
      from: oldestDate,
      to: newestDate,
    } satisfies ICommunityBbsUserStatusDateRange;
    const dateRangeResponse =
      await api.functional.communityBbs.admin.users.status.index(
        adminConnection,
        {
          body: {
            createdAt: dateRange,
          } satisfies ICommunityBbsUserStatus.IRequest,
        },
      );
    typia.assert(dateRangeResponse);
    // Count records in baseline data within range
    const expectedInRangeCount = allStatuses.filter(
      (item) =>
        new Date(item.createdAt) >= new Date(oldestDate) &&
        new Date(item.createdAt) <= new Date(newestDate),
    ).length;
    TestValidator.equals(
      "date range filtering returns correct count",
      dateRangeResponse.data.length,
      expectedInRangeCount,
    );
  }
  // Step 5: Test user ID filtering
  if (allStatuses.length > 0) {
    const targetUserID = allStatuses[0].id;
    const userIDResponse =
      await api.functional.communityBbs.admin.users.status.index(
        adminConnection,
        {
          body: {
            userId: targetUserID,
          } satisfies ICommunityBbsUserStatus.IRequest,
        },
      );
    typia.assert(userIDResponse);
    // Only one item should match if ID exists
    TestValidator.equals(
      "user ID filtering returns correct count",
      userIDResponse.data.length,
      1,
    );
    TestValidator.equals(
      "returned item has correct user ID",
      userIDResponse.data[0].id,
      targetUserID,
    );
  }
  // Step 6: Test combined filtering (status + date range + user ID)
  if (allStatuses.length > 0) {
    const targetStatus = RandomGenerator.pick([
      "active",
      "suspended",
      "banned",
      "pending_verification",
    ] as const);
    const dates = allStatuses.map((item) => new Date(item.createdAt));
    const oldestDate = new Date(Math.min(...dates.map(d => d.getTime()))).toISOString();
    const newestDate = new Date(Math.max(...dates.map(d => d.getTime()))).toISOString();
    const targetUserID = allStatuses[0].id;
    const combinedFilterResponse =
      await api.functional.communityBbs.admin.users.status.index(
        adminConnection,
        {
          body: {
            status: [targetStatus],
            createdAt: {
              from: oldestDate,
              to: newestDate,
            } satisfies ICommunityBbsUserStatusDateRange,
            userId: targetUserID,
          } satisfies ICommunityBbsUserStatus.IRequest,
        },
      );
    typia.assert(combinedFilterResponse);
    // Find records matching all three criteria
    const expectedCombinedCount = allStatuses.filter(
      (item) =>
        item.status === targetStatus &&
        new Date(item.createdAt) >= new Date(oldestDate) &&
        new Date(item.createdAt) <= new Date(newestDate) &&
        item.id === targetUserID,
    ).length;
    TestValidator.equals(
      "combined filtering returns correct count",
      combinedFilterResponse.data.length,
      expectedCombinedCount,
    );
  }
  // Step 7: Test pagination (page=1, limit=5)
  const paginationResponse =
    await api.functional.communityBbs.admin.users.status.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies ICommunityBbsUserStatus.IRequest,
      },
    );
  typia.assert(paginationResponse);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    paginationResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    paginationResponse.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    paginationResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    paginationResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data array length <= limit",
    paginationResponse.data.length <= 5,
  );
  // Step 8: Test case-insensitive status matching
  const statusToTest = RandomGenerator.pick([
    "active",
    "suspended",
    "banned",
    "pending_verification",
  ] as const);
  const uppercaseStatus = statusToTest.toUpperCase();
  // First, get count with lowercase status
  const lowercaseResponse =
    await api.functional.communityBbs.admin.users.status.index(
      adminConnection,
      {
        body: {
          status: [statusToTest],
        } satisfies ICommunityBbsUserStatus.IRequest,
      },
    );
  typia.assert(lowercaseResponse);
  // Then get count with uppercase status
  const uppercaseResponse =
    await api.functional.communityBbs.admin.users.status.index(
      adminConnection,
      {
        body: {
          status: [uppercaseStatus],
        } satisfies ICommunityBbsUserStatus.IRequest,
      },
    );
  typia.assert(uppercaseResponse);
  TestValidator.equals(
    "case-insensitive status matching counts",
    uppercaseResponse.data.length,
    lowercaseResponse.data.length,
  );
  // Step 9: Test default pagination parameters
  const defaultResponse =
    await api.functional.communityBbs.admin.users.status.index(
      adminConnection,
      {
        body: {} satisfies ICommunityBbsUserStatus.IRequest,
      },
    );
  typia.assert(defaultResponse);
  // Default is page=1 and limit=10
  TestValidator.equals(
    "default pagination page",
    defaultResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "default pagination limit",
    defaultResponse.pagination.limit,
    10,
  );
  // Step 10: Test maximum limit (100)
  const maxLimitResponse =
    await api.functional.communityBbs.admin.users.status.index(
      adminConnection,
      {
        body: {
          limit: 100,
        } satisfies ICommunityBbsUserStatus.IRequest,
      },
    );
  typia.assert(maxLimitResponse);
  TestValidator.equals("maximum limit", maxLimitResponse.pagination.limit, 100);
  // Step 11: Validate that response conforms to IPageICommunityBbsUserStatus.ISummary
  // We're using typia.assert() above to ensure complete structure validity
  // This is sufficient - no additional validation needed
}