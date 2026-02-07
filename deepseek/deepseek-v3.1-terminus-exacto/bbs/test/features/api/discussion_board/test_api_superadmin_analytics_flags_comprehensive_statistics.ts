import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentFlag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_analytics_flags_comprehensive_statistics(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Note: Since we don't have content flag creation endpoints available,
  // we'll test the analytics endpoint with various filter combinations
  // to ensure it handles different query parameters correctly
  // Test 1: Get analytics without filters (all flags)
  const allFlags =
    await api.functional.discussionBoard.superAdmin.analytics.flags.index(
      superAdminConnection,
      {
        body: {} satisfies IDiscussionBoardContentFlag.IRequest,
      },
    );
  typia.assert(allFlags);
  // Test 2: Filter by specific statuses
  const statuses = [
    "pending",
    "under investigation",
    "resolved",
    "dismissed",
  ] as const;
  for (const status of statuses) {
    const filteredFlags =
      await api.functional.discussionBoard.superAdmin.analytics.flags.index(
        superAdminConnection,
        {
          body: {
            status: status,
          } satisfies IDiscussionBoardContentFlag.IRequest,
        },
      );
    typia.assert(filteredFlags);
    TestValidator.predicate(
      `status ${status} returns valid pagination`,
      filteredFlags.pagination.current >= 0 &&
        filteredFlags.pagination.limit >= 0,
    );
  }
  // Test 3: Filter by date ranges
  const today = new Date().toISOString();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const recentFlags =
    await api.functional.discussionBoard.superAdmin.analytics.flags.index(
      superAdminConnection,
      {
        body: {
          created_at_min: yesterday,
          created_at_max: today,
        } satisfies IDiscussionBoardContentFlag.IRequest,
      },
    );
  typia.assert(recentFlags);
  // Test 4: Filter by resolved date ranges
  const resolvedFlags =
    await api.functional.discussionBoard.superAdmin.analytics.flags.index(
      superAdminConnection,
      {
        body: {
          resolved_at_min: yesterday,
          resolved_at_max: today,
        } satisfies IDiscussionBoardContentFlag.IRequest,
      },
    );
  typia.assert(resolvedFlags);
  // Test 5: Test pagination with different limits
  const pageSizes = [5, 10, 20, 50] as const;
  for (const limit of pageSizes) {
    const paginatedFlags =
      await api.functional.discussionBoard.superAdmin.analytics.flags.index(
        superAdminConnection,
        {
          body: {
            page: 1,
            limit: limit,
          } satisfies IDiscussionBoardContentFlag.IRequest,
        },
      );
    typia.assert(paginatedFlags);
    TestValidator.equals(
      `limit ${limit} is respected`,
      paginatedFlags.pagination.limit,
      limit,
    );
  }
  // Test 6: Combined filters
  const combinedFilters =
    await api.functional.discussionBoard.superAdmin.analytics.flags.index(
      superAdminConnection,
      {
        body: {
          status: "resolved",
          created_at_min: yesterday,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardContentFlag.IRequest,
      },
    );
  typia.assert(combinedFilters);
  // Test 7: Text search in flag reason
  const searchFlags =
    await api.functional.discussionBoard.superAdmin.analytics.flags.index(
      superAdminConnection,
      {
        body: {
          flag_reason: "test",
        } satisfies IDiscussionBoardContentFlag.IRequest,
      },
    );
  typia.assert(searchFlags);
  // Test 8: Future date filter (should return empty)
  const futureFlags =
    await api.functional.discussionBoard.superAdmin.analytics.flags.index(
      superAdminConnection,
      {
        body: {
          created_at_min: tomorrow,
        } satisfies IDiscussionBoardContentFlag.IRequest,
      },
    );
  typia.assert(futureFlags);
  // Validate pagination structure for all responses
  const testCases = [
    allFlags,
    recentFlags,
    resolvedFlags,
    combinedFilters,
    searchFlags,
    futureFlags,
  ];
  for (const [index, testCase] of testCases.entries()) {
    TestValidator.equals(
      `test case ${index} has pagination`,
      typeof testCase.pagination,
      "object",
    );
    TestValidator.predicate(
      `test case ${index} has valid current page`,
      testCase.pagination.current >= 0,
    );
    TestValidator.predicate(
      `test case ${index} has valid limit`,
      testCase.pagination.limit >= 0,
    );
    TestValidator.predicate(
      `test case ${index} has valid records count`,
      testCase.pagination.records >= 0,
    );
    TestValidator.predicate(
      `test case ${index} has valid pages count`,
      testCase.pagination.pages >= 0,
    );
    // Validate data array structure
    TestValidator.equals(
      `test case ${index} has data array`,
      Array.isArray(testCase.data),
      true,
    );
    if (testCase.data.length > 0) {
      // Validate individual flag structure if data exists
      for (const flag of testCase.data) {
        typia.assert(flag);
        TestValidator.predicate(
          `flag ${flag.id} has valid structure`,
          typeof flag.id === "string" &&
            typeof flag.flag_reason === "string" &&
            typeof flag.status === "string" &&
            typeof flag.created_at === "string" &&
            typeof flag.reporter_user_id === "string",
        );
      }
    }
  }
}
