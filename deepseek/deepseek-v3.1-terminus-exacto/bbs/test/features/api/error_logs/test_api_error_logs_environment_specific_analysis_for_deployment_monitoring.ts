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

export async function test_api_error_logs_environment_specific_analysis_for_deployment_monitoring(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Search error logs filtering by production environment only
  const errorLogsResponse =
    await api.functional.discussionBoard.superAdmin.error_logs.index(
      superAdminConnection,
      {
        body: {
          environments: ["production"],
          error_types: ["system_error", "validation_error"],
        } satisfies IDiscussionBoardErrorLog.IRequest,
      },
    );
  typia.assert(errorLogsResponse);
  // 3. Verify response contains only production environment errors
  TestValidator.predicate(
    "all errors are from production environment",
    errorLogsResponse.data.every((log) => log.environment === "production"),
  );
  // 4. Validate error types are filtered correctly
  TestValidator.predicate(
    "all errors are of specified types",
    errorLogsResponse.data.every((log) =>
      ["system_error", "validation_error"].includes(log.error_type),
    ),
  );
  // 5. Check that error_count reflects actual frequency
  TestValidator.predicate(
    "error_count is positive",
    errorLogsResponse.data.every((log) => log.error_count > 0),
  );
  // 6. Validate component information is properly included
  TestValidator.predicate(
    "component field exists in all records",
    errorLogsResponse.data.every((log) => log.component !== undefined),
  );
  // 7. Verify aggregation grouping by checking unique combinations
  const uniqueGroups = new Set(
    errorLogsResponse.data.map(
      (log) =>
        `${log.error_type}-${log.severity}-${log.component}-${log.environment}`,
    ),
  );
  TestValidator.equals(
    "each group appears only once",
    uniqueGroups.size,
    errorLogsResponse.data.length,
  );
  // 8. Verify pagination structure
  TestValidator.predicate(
    "pagination structure is valid",
    errorLogsResponse.pagination.current >= 0 &&
      errorLogsResponse.pagination.limit >= 0 &&
      errorLogsResponse.pagination.records >= 0 &&
      errorLogsResponse.pagination.pages >= 0,
  );
}
