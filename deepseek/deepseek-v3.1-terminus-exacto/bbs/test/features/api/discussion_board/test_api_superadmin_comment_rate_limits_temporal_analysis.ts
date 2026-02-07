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

export async function test_api_superadmin_comment_rate_limits_temporal_analysis(
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
  // Note: This test focuses on validating the filtering functionality of existing records
  // Since we cannot create comment rate limit records directly (no creation endpoint provided),
  // we test the filtering logic assuming the system has existing records
  // Test filtering with date range covering specific time window
  const now = new Date();
  const startDate = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 7 days ago
  const endDate = new Date(
    now.getTime() - 2 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 2 days ago
  const response =
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
  typia.assert(response);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination exists",
    response.pagination !== undefined,
  );
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals("limit is 10", response.pagination.limit, 10);
  // Validate that all returned records are within the date range (if any records exist)
  if (response.data.length > 0) {
    response.data.forEach((record) => {
      const submittedAt = new Date(record.submitted_at);
      const start = new Date(startDate);
      const end = new Date(endDate);
      TestValidator.predicate(
        "record within date range",
        submittedAt >= start && submittedAt <= end,
      );
    });
  }
  // Test boundary case: exact date match
  const exactDateResponse =
    await api.functional.discussionBoard.superAdmin.comment_rate_limits.index(
      superAdminConnection,
      {
        body: {
          start_date: startDate,
          end_date: startDate,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentRateLimit.IRequest,
      },
    );
  typia.assert(exactDateResponse);
  // Test without date filters to get all records
  const allRecordsResponse =
    await api.functional.discussionBoard.superAdmin.comment_rate_limits.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentRateLimit.IRequest,
      },
    );
  typia.assert(allRecordsResponse);
  // Verify pagination consistency
  TestValidator.predicate(
    "pagination metadata valid",
    allRecordsResponse.pagination.records >= 0,
  );
}
