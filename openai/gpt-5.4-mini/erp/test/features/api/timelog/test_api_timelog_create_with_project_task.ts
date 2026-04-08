import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import type { IErpHrmTimeTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTask";
import type { IErpHrmTimeTaskHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTaskHistoryEntry";
import type { IErpHrmTimeTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_member_projects_create } from "../../../generate/generate_random_erp_hrm_time_member_projects_create";
import { generate_random_erp_hrm_time_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_time_member_projects_tasks_create";
import { generate_random_erp_hrm_time_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_time_member_timelogs_create";
import { prepare_random_erp_hrm_time_project } from "../../../prepare/prepare_random_erp_hrm_time_project";
import { prepare_random_erp_hrm_time_task_history_entry } from "../../../prepare/prepare_random_erp_hrm_time_task_history_entry";
import { prepare_random_erp_hrm_time_timelog } from "../../../prepare/prepare_random_erp_hrm_time_timelog";

export async function test_api_timelog_create_with_project_task(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      displayName: RandomGenerator.name(),
      href: "https://example.com/erpHrmTime/join",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(joined);
  const project = await generate_random_erp_hrm_time_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        colorCode: "#4F46E5",
        status: "active",
        budgetHours: 8,
        startDate: new Date().toISOString(),
        endDate: null,
      } satisfies IErpHrmTimeProject.ICreate,
    },
  );
  typia.assert(project);
  const task = await generate_random_erp_hrm_time_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        status: "open",
        priority: "medium",
        estimatedHours: 2,
        dueDate: null,
        employeeId: null,
        parentTaskId: null,
      } satisfies IErpHrmTimeTaskHistoryEntry.ICreate,
    },
  );
  typia.assert(task);
  const timelog = await generate_random_erp_hrm_time_member_timelogs_create(
    memberConnection,
    {
      body: {
        workDate: new Date().toISOString(),
        durationMinutes: 90,
        projectId: project.id,
        taskId: task.id,
        description: `Worked on ${task.title}`,
        billable: true,
      } satisfies IErpHrmTimeTimelog.ICreate,
    },
  );
  typia.assert(timelog);
  TestValidator.equals(
    "timelog project matches",
    timelog.project.id,
    project.id,
  );
  TestValidator.predicate("timelog task matches", timelog.task !== null && timelog.task !== undefined);
  TestValidator.predicate(
    "timelog member is present",
    timelog.member !== null && timelog.member !== undefined,
  );
  TestValidator.equals("timelog billable flag", timelog.billable, true);
  TestValidator.equals(
    "timelog description",
    timelog.description,
    `Worked on ${task.title}`,
  );
}
