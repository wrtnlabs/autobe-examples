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

/**
 * Test analytics retrieval when no flags match the specified criteria.
 * Use specific filters that intentionally exclude all existing content flags
 * (e.g., future date ranges, non-existent status values, or specific reporter IDs that don't exist).
 * Verify that the endpoint returns an empty data array with proper pagination metadata
 * showing zero records and pages. Ensure the system handles empty result sets gracefully
 * without errors and provides accurate count statistics.
 */
export async function test_api_superadmin_analytics_flags_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Create superAdmin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Use filters that guarantee no results - future date and non-existent status
  const futureDate = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 365,
  ).toISOString(); // 1 year in future
  const nonExistentReporterId = typia.random<string & tags.Format<"uuid">>();
  const analyticsResponse =
    await api.functional.discussionBoard.superAdmin.analytics.flags.index(
      superAdminConnection,
      {
        body: {
          status: "dismissed" as const,
          reporter_user_id: nonExistentReporterId,
          created_at_min: futureDate,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardContentFlag.IRequest,
      },
    );
  typia.assert(analyticsResponse);
  // Validate empty result set
  TestValidator.equals(
    "data array should be empty",
    analyticsResponse.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records should be 0",
    analyticsResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages should be 0",
    analyticsResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "current page should be 1",
    analyticsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should be 10",
    analyticsResponse.pagination.limit,
    10,
  );
}
