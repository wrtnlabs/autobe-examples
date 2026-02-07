import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCommentRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentRateLimit";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardCommentRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentRateLimit";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test comprehensive comment rate limit monitoring functionality for super administrators.
 * Validates paginated retrieval of rate limit records with filtering capabilities.
 */
export async function test_api_superadmin_comment_rate_limits_comprehensive_monitoring(
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
  // Test 1: Retrieve all records with default pagination
  const allRecords =
    await api.functional.discussionBoard.superAdmin.comment_rate_limits.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentRateLimit.IRequest,
      },
    );
  typia.assert(allRecords);
  // Test 2: Filter by specific page and limit
  const customPagination =
    await api.functional.discussionBoard.superAdmin.comment_rate_limits.index(
      superAdminConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IDiscussionBoardCommentRateLimit.IRequest,
      },
    );
  typia.assert(customPagination);
  TestValidator.equals("custom page", customPagination.pagination.current, 2);
  TestValidator.equals("custom limit", customPagination.pagination.limit, 5);
  // Test 3: Filter by date range (if records exist)
  if (allRecords.data.length > 0) {
    const firstRecord = allRecords.data[0];
    const startDate = new Date(
      Date.parse(firstRecord.submitted_at) - 86400000,
    ).toISOString(); // 1 day before
    const endDate = new Date(
      Date.parse(firstRecord.submitted_at) + 86400000,
    ).toISOString(); // 1 day after
    const dateFiltered =
      await api.functional.discussionBoard.superAdmin.comment_rate_limits.index(
        superAdminConnection,
        {
          body: {
            start_date: startDate,
            end_date: endDate,
            page: 1,
            limit: 10,
          } satisfies IDiscussionBoardCommentRateLimit.IRequest,
        },
      );
    typia.assert(dateFiltered);
    // Validate that filtered records fall within date range
    for (const record of dateFiltered.data) {
      const submittedTime = Date.parse(record.submitted_at);
      const startTime = Date.parse(startDate);
      const endTime = Date.parse(endDate);
      TestValidator.predicate(
        "record within date range",
        submittedTime >= startTime && submittedTime <= endTime,
      );
    }
  }
  // Test 4: Verify pagination calculations
  if (allRecords.pagination.records > 0) {
    const expectedPages = Math.ceil(
      allRecords.pagination.records / allRecords.pagination.limit,
    );
    TestValidator.equals(
      "correct pages calculation",
      allRecords.pagination.pages,
      expectedPages,
    );
  }
  // Test 5: Edge case - maximum limit
  const maxLimit =
    await api.functional.discussionBoard.superAdmin.comment_rate_limits.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardCommentRateLimit.IRequest,
      },
    );
  typia.assert(maxLimit);
  TestValidator.equals("maximum limit", maxLimit.pagination.limit, 100);
}
