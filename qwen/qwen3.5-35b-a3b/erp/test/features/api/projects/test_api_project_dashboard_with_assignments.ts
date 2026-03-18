import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import type { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import type { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import type { IHrmsTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimer";
import type { IHrmsTopEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTopEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_project_dashboard_with_assignments(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Call project dashboard endpoint with authenticated member
  const dashboard =
    await api.functional.hrms.member.projects.dashboard(memberConnection);
  typia.assert(dashboard);
  // 3. Validate response structure
  TestValidator.equals(
    "has dashboard type",
    dashboard.dashboard_type,
    "personal",
  );
  TestValidator.predicate(
    "has generation timestamp",
    dashboard.generation_timestamp !== undefined,
  );
  // 4. Validate budget_alerts array structure (actual project data in response)
  const budgetAlerts = dashboard.budget_alerts ?? [];
  TestValidator.equals(
    "budget_alerts is array",
    Array.isArray(dashboard.budget_alerts),
    true,
  );
  // 5. Validate total_hours_this_week structure
  TestValidator.predicate(
    "has total_hours_this_week (can be null or number)",
    dashboard.total_hours_this_week === null ||
      typeof dashboard.total_hours_this_week === "number",
  );
  // 6. Validate each budget_alert project has required fields
  budgetAlerts.forEach((project: IHrmsProject.ISummary, index: number) => {
    TestValidator.equals(
      `budget_alert ${index} has id`,
      typeof project.id,
      "string",
    );
    TestValidator.equals(
      `budget_alert ${index} has name`,
      typeof project.name,
      "string",
    );
    TestValidator.equals(
      `budget_alert ${index} has organization_name`,
      typeof project.organization_name,
      "string",
    );
    TestValidator.equals(
      `budget_alert ${index} has status`,
      ["active", "archived", "completed"].includes(project.status),
      true,
    );
    TestValidator.equals(
      `budget_alert ${index} has budget_hours`,
      project.budget_hours === null || typeof project.budget_hours === "number",
      true,
    );
    TestValidator.equals(
      `budget_alert ${index} has actual_hours`,
      typeof project.actual_hours,
      "number",
    );
    TestValidator.equals(
      `budget_alert ${index} has budget_utilization_percentage`,
      project.budget_utilization_percentage === null ||
        typeof project.budget_utilization_percentage === "number",
      true,
    );
    TestValidator.equals(
      `budget_alert ${index} has total_tasks`,
      typeof project.total_tasks,
      "number",
    );
    TestValidator.equals(
      `budget_alert ${index} has pending_tasks`,
      typeof project.pending_tasks,
      "number",
    );
    TestValidator.equals(
      `budget_alert ${index} has in_progress_tasks`,
      typeof project.in_progress_tasks,
      "number",
    );
    TestValidator.equals(
      `budget_alert ${index} has completed_tasks`,
      typeof project.completed_tasks,
      "number",
    );
    TestValidator.equals(
      `budget_alert ${index} has closed_tasks`,
      typeof project.closed_tasks,
      "number",
    );
    TestValidator.equals(
      `budget_alert ${index} has timelog_count`,
      typeof project.timelog_count,
      "number",
    );
    TestValidator.equals(
      `budget_alert ${index} has created_at`,
      typeof project.created_at,
      "string",
    );
    TestValidator.equals(
      `budget_alert ${index} has updated_at`,
      typeof project.updated_at,
      "string",
    );
  });
  // 7. Validate budget utilization calculation
  budgetAlerts.forEach((project: IHrmsProject.ISummary) => {
    let expectedUtilization: number | null = null;
    if (project.budget_hours !== null && project.budget_hours > 0) {
      expectedUtilization = Number(
        ((project.actual_hours / project.budget_hours) * 100).toFixed(1),
      );
    } else if (project.budget_hours === null) {
      expectedUtilization = null;
    }
    TestValidator.equals(
      `project ${project.id} budget utilization calculation`,
      project.budget_utilization_percentage,
      expectedUtilization,
    );
  });
  // 8. Validate task status counts consistency
  budgetAlerts.forEach((project: IHrmsProject.ISummary) => {
    const taskSum =
      project.pending_tasks +
      project.in_progress_tasks +
      project.completed_tasks +
      project.closed_tasks;
    TestValidator.equals(
      `project ${project.id} task counts sum to total`,
      taskSum,
      project.total_tasks,
    );
  });
  // 9. Validate assigned_tasks array structure (if present)
  const assignedTasks = dashboard.assigned_tasks ?? [];
  TestValidator.equals(
    "assigned_tasks is array",
    Array.isArray(dashboard.assigned_tasks),
    true,
  );
  // 10. Validate recent_timelogs array structure (if present)
  const recentTimelogs = dashboard.recent_timelogs ?? [];
  TestValidator.equals(
    "recent_timelogs is array",
    Array.isArray(dashboard.recent_timelogs),
    true,
  );
  // 11. Validate top_employees array structure (if present)
  const topEmployees = dashboard.top_employees ?? [];
  TestValidator.equals(
    "top_employees is array",
    Array.isArray(dashboard.top_employees),
    true,
  );
}
