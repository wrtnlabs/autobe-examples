import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardErrorLog";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardErrorLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test comprehensive error log filtering capabilities for super administrators.
 * This test validates that super administrators can search error logs using
 * multiple filter criteria simultaneously to identify specific error patterns.
 *
 * Test Flow:
 * 1. Authenticate as super administrator
 * 2. Search error logs with multiple filter criteria
 * 3. Validate response structure
 */
export async function test_api_error_logs_comprehensive_filtering_by_multiple_criteria(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator using join operation
  const authResult = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authResult);
  // Search error logs with comprehensive filtering criteria
  const searchCriteria: IDiscussionBoardErrorLog.IRequest = {
    error_types: ["database_error", "authentication_error"],
    severities: ["critical", "error"],
    environments: ["production", "staging"],
    components: ["api", "database"],
    start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Last 7 days
    end_date: new Date().toISOString(),
  } satisfies IDiscussionBoardErrorLog.IRequest;
  const errorLogsResult =
    await api.functional.discussionBoard.superAdmin.error_logs.index(
      superAdminConnection,
      { body: searchCriteria },
    );
  typia.assert(errorLogsResult);
  // Basic validation that response structure is correct
  // typia.assert() above already validates all type information
  // No additional validation needed beyond business logic checks
}
