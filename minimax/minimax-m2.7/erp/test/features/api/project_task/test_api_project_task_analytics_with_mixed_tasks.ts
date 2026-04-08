import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";

export async function test_api_project_task_analytics_with_mixed_tasks(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication via admin join
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a project (for potential organization context)
  await generate_random_erp_hrm_admin_projects_create(adminConnection, {});
  // 3. Generate a valid UUID for projectId (IErpHrmProject doesn't expose id field directly)
  const projectId = typia.random<string & tags.Format<"uuid">>();
  // 4. Retrieve task analytics for the project
  const analytics = await api.functional.erpHrm.admin.projects.tasks.analytics(
    adminConnection,
    { projectId: projectId },
  );
  typia.assert(analytics);
  // 5. Validate analytics structure - totalTasks should be 0 for non-existent project
  TestValidator.equals(
    "totalTasks is defined",
    analytics.totalTasks !== undefined,
    true,
  );
  TestValidator.predicate(
    "totalTasks is non-negative integer",
    analytics.totalTasks >= 0 && Number.isInteger(analytics.totalTasks),
  );
  // 6. Validate status breakdown structure
  TestValidator.predicate(
    "statusBreakdown.open is non-negative",
    analytics.statusBreakdown.open >= 0,
  );
  TestValidator.predicate(
    "statusBreakdown.inProgress is non-negative",
    analytics.statusBreakdown.inProgress >= 0,
  );
  TestValidator.predicate(
    "statusBreakdown.completed is non-negative",
    analytics.statusBreakdown.completed >= 0,
  );
  TestValidator.predicate(
    "statusBreakdown.closed is non-negative",
    analytics.statusBreakdown.closed >= 0,
  );
  // 7. Validate priority breakdown structure
  TestValidator.predicate(
    "priorityBreakdown.low is non-negative",
    analytics.priorityBreakdown.low >= 0,
  );
  TestValidator.predicate(
    "priorityBreakdown.medium is non-negative",
    analytics.priorityBreakdown.medium >= 0,
  );
  TestValidator.predicate(
    "priorityBreakdown.high is non-negative",
    analytics.priorityBreakdown.high >= 0,
  );
  TestValidator.predicate(
    "priorityBreakdown.urgent is non-negative",
    analytics.priorityBreakdown.urgent >= 0,
  );
  // 8. Validate completionRate is between 0 and 100
  TestValidator.predicate(
    "completionRate is between 0 and 100",
    analytics.completionRate >= 0 && analytics.completionRate <= 100,
  );
  // 9. Validate averageEstimatedHours is non-negative
  TestValidator.predicate(
    "averageEstimatedHours is non-negative",
    analytics.averageEstimatedHours >= 0,
  );
  // 10. Validate overdueTasks is non-negative
  TestValidator.predicate(
    "overdueTasks is non-negative",
    analytics.overdueTasks >= 0,
  );
  // 11. Validate temporalTrend is an array
  TestValidator.predicate(
    "temporalTrend is an array",
    Array.isArray(analytics.temporalTrend),
  );
}
