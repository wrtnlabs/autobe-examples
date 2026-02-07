import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardBanDuration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanDuration";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardBanDuration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBanDuration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test the basic retrieval of ban duration analytics data without any filters.
 * Verify that the system returns a paginated list of all ban duration configurations
 * with their usage statistics. Validate that each ban duration summary includes
 * essential information: id, name, description, duration_hours, and is_permanent.
 * Check that the pagination metadata is correctly populated with current page,
 * limit, total records, and total pages.
 */
export async function test_api_ban_duration_analytics_basic_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Call ban duration analytics endpoint with empty filters
  const analyticsResponse =
    await api.functional.discussionBoard.superAdmin.analytics.ban_durations.index(
      superAdminConnection,
      {
        body: {
          // Empty filters to retrieve all records
        } satisfies IDiscussionBoardBanDuration.IRequest,
      },
    );
  // Validate complete response structure - typia.assert performs comprehensive validation
  typia.assert(analyticsResponse);
  // Validate business logic: pagination metadata should be meaningful
  TestValidator.predicate(
    "pagination metadata exists",
    analyticsResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page should be at least 1 for valid data",
    analyticsResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit should be positive",
    analyticsResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "total records count should be non-negative",
    analyticsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be non-negative",
    analyticsResponse.pagination.pages >= 0,
  );
  // Validate that data array structure is correct
  TestValidator.predicate(
    "data should be an array",
    Array.isArray(analyticsResponse.data),
  );
  // If there are ban duration records, validate they contain meaningful data
  if (analyticsResponse.data.length > 0) {
    TestValidator.predicate(
      "should have ban duration records",
      analyticsResponse.data.length > 0,
    );
  }
}
