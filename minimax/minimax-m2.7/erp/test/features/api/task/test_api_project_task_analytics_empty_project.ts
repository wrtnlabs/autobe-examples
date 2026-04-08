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

/**
 * Test retrieving task analytics for a newly created project with no tasks.
 *
 * This test verifies that the task analytics endpoint correctly handles
 * an empty project with zero tasks, validating all zero-state metrics
 * including status breakdown, priority breakdown, completion rate,
 * and temporal trend arrays.
 */
export async function test_api_project_task_analytics_empty_project(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  // 2. Create an empty project
  const project = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#4A90E2",
      } satisfies IErpHrmProject.ICreate,
    },
  ) as IErpHrmProject & IEntity;
  // 3. Retrieve task analytics for the empty project
  const analytics = await api.functional.erpHrm.admin.projects.tasks.analytics(
    adminConnection,
    {
      projectId: project.id,
    },
  );
  typia.assert(analytics);
  // 4. Validate all zero-state metrics
  TestValidator.equals("totalTasks should be 0", analytics.totalTasks, 0);
  // Status breakdown should have all zeros
  TestValidator.equals(
    "statusBreakdown.open should be 0",
    analytics.statusBreakdown.open,
    0,
  );
  TestValidator.equals(
    "statusBreakdown.inProgress should be 0",
    analytics.statusBreakdown.inProgress,
    0,
  );
  TestValidator.equals(
    "statusBreakdown.completed should be 0",
    analytics.statusBreakdown.completed,
    0,
  );
  TestValidator.equals(
    "statusBreakdown.closed should be 0",
    analytics.statusBreakdown.closed,
    0,
  );
  // Priority breakdown should have all zeros
  TestValidator.equals(
    "priorityBreakdown.low should be 0",
    analytics.priorityBreakdown.low,
    0,
  );
  TestValidator.equals(
    "priorityBreakdown.medium should be 0",
    analytics.priorityBreakdown.medium,
    0,
  );
  TestValidator.equals(
    "priorityBreakdown.high should be 0",
    analytics.priorityBreakdown.high,
    0,
  );
  TestValidator.equals(
    "priorityBreakdown.urgent should be 0",
    analytics.priorityBreakdown.urgent,
    0,
  );
  // Completion rate should be 0 (division by zero case handled)
  TestValidator.equals(
    "completionRate should be 0",
    analytics.completionRate,
    0,
  );
  // Average estimated hours should be null (no tasks with estimates)
  TestValidator.equals(
    "averageEstimatedHours should be null",
    analytics.averageEstimatedHours,
    null,
  );
  // Overdue tasks should be 0
  TestValidator.equals("overdueTasks should be 0", analytics.overdueTasks, 0);
  // Temporal trend should be empty array
  TestValidator.equals(
    "temporalTrend should be empty array",
    analytics.temporalTrend,
    [],
  );
}