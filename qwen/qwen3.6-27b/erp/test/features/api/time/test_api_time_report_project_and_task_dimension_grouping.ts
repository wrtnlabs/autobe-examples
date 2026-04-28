import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import type { IReportTime } from "@ORGANIZATION/PROJECT-api/lib/structures/IReportTime";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_member_projects_tasks_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

/**
 * Test time report with different grouping dimensions (project and task) and optional filtering.
 *
 * This test verifies that time reports correctly aggregate and display hours based on different grouping dimensions and employee filtering.
 *
 * 1. Authenticate as member using authorize_member_join utility function
 * 2. Create a project within the organization using generate_random_hrm_platform_member_projects_create utility function
 * 3. Create tasks within the project using generate_random_hrm_platform_member_projects_tasks_create utility function
 * 4. Create multiple timelogs for the authenticated employee on the project, some with task references, some without
 * 5. Test project dimension grouping:
 *    - dimension: 'project'
 *    - Verify report groups hours by project
 *    - Verify project summary contains correct project identity
 *    - Verify total_hours, billable_hours, non_billable_hours are accurately aggregated per project
 * 6. Test task dimension grouping:
 *    - dimension: 'task'
 *    - Verify report groups hours by task
 *    - Verify task summary populated for timelogs with task references
 *    - Verify hours correctly attributed to respective tasks
 * 7. Test employee filter:
 *    - Include employee_id filter
 *    - Verify only that employee's time appears in results
 *
 * Validation points:
 * - Project and task grouping dimensions work correctly
 * - Entity summaries (project, task) properly populated based on grouping dimension
 * - Filtering by employee_id narrows scope correctly
 * - Null task references handled gracefully in task dimension grouping
 */
export async function test_api_time_report_project_and_task_dimension_grouping(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
    },
  });
  // 2. Create a project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: typia.random<string>(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        budget: typia.random<number & tags.Minimum<0>>(),
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    },
  );
  typia.assert(project);
  // 3. Create multiple tasks within the project
  const task1 = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 1 }),
        status: "open" satisfies IHrmPlatformTask.ICreate["status"],
        priority: "medium" satisfies IHrmPlatformTask.ICreate["priority"],
        estimated_hours: typia.random<number & tags.Minimum<0>>(),
        due_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
      params: { projectId: project.id },
    },
  );
  typia.assert(task1);
  const task2 = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 1 }),
        status: "open" satisfies IHrmPlatformTask.ICreate["status"],
        priority: "high" satisfies IHrmPlatformTask.ICreate["priority"],
        estimated_hours: typia.random<number & tags.Minimum<0>>(),
        due_at: new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString(),
      },
      params: { projectId: project.id },
    },
  );
  typia.assert(task2);
  // 4. Create timelogs with task references and without
  const timelogDate = new Date().toISOString();
  // Timelog with task1 reference (billable)
  const timelogWithTask1 =
    await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          projectId: project.id,
          taskId: task1.id,
          date: timelogDate,
          durationMinutes: 120,
          workDescription: RandomGenerator.paragraph({ sentences: 1 }),
          billable: true,
        },
      },
    );
  typia.assert(timelogWithTask1);
  // Timelog with task2 reference (non-billable)
  const timelogWithTask2 =
    await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          projectId: project.id,
          taskId: task2.id,
          date: timelogDate,
          durationMinutes: 90,
          workDescription: RandomGenerator.paragraph({ sentences: 1 }),
          billable: false,
        },
      },
    );
  typia.assert(timelogWithTask2);
  // Timelog without task reference (billable)
  const timelogWithoutTask =
    await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          projectId: project.id,
          taskId: null,
          date: timelogDate,
          durationMinutes: 150,
          workDescription: RandomGenerator.paragraph({ sentences: 1 }),
          billable: true,
        },
      },
    );
  typia.assert(timelogWithoutTask);
  // 4. Test project dimension grouping
  const projectReport =
    await api.functional.hrmPlatform.member.reports.time.timeReport(
      memberConnection,
      {
        body: {
          from: timelogDate,
          to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          dimension: "project",
          employee_id: undefined,
          project_id: undefined,
          task_id: undefined,
          billable: undefined,
          page: null,
          limit: null,
        } satisfies IReportTime.IRequest,
      },
    );
  typia.assert(projectReport);
  // Project group exists for created project
  TestValidator.predicate(
    "project summary contains correct project identity",
    projectReport.project !== null,
  );
  TestValidator.equals(
    "project summary id matches created project",
    projectReport.project?.id,
    project.id,
  );
  // Total hours, billable hours, non-billable hours are accurately aggregated per project
  const expectedTotalHours = (120 + 90 + 150) / 60; // 360 minutes / 60 = 6 hours
  const expectedBillableHours = (120 + 150) / 60; // 270 minutes / 60 = 4.5 hours
  const expectedNonBillableHours = 90 / 60; // 90 minutes / 60 = 1.5 hours
  TestValidator.equals(
    "total_hours matches expected",
    projectReport.total_hours,
    expectedTotalHours,
  );
  TestValidator.equals(
    "billable_hours matches expected",
    projectReport.billable_hours,
    expectedBillableHours,
  );
  TestValidator.equals(
    "non_billable_hours matches expected",
    projectReport.non_billable_hours,
    expectedNonBillableHours,
  );
  // 5. Test task dimension grouping
  const taskReport =
    await api.functional.hrmPlatform.member.reports.time.timeReport(
      memberConnection,
      {
        body: {
          from: timelogDate,
          to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          dimension: "task",
          employee_id: undefined,
          project_id: undefined,
          task_id: undefined,
          billable: undefined,
          page: null,
          limit: null,
        } satisfies IReportTime.IRequest,
      },
    );
  typia.assert(taskReport);
  // Task summary populated for timelogs with task references
  TestValidator.equals(
    "task summary matches task2",
    taskReport.task?.id,
    task2.id,
  );
  // Hours correctly attributed to respective tasks
  TestValidator.equals(
    "task dimension total_hours",
    taskReport.total_hours,
    expectedTotalHours,
  );
  TestValidator.equals(
    "task dimension billable_hours",
    taskReport.billable_hours,
    expectedBillableHours,
  );
  TestValidator.equals(
    "task dimension non_billable_hours",
    taskReport.non_billable_hours,
    expectedNonBillableHours,
  );
  // Null task references handled gracefully in task dimension grouping - test without task filter
  const taskReport2 =
    await api.functional.hrmPlatform.member.reports.time.timeReport(
      memberConnection,
      {
        body: {
          from: timelogDate,
          to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          dimension: "task",
          task_id: null,
          employee_id: undefined,
          project_id: undefined,
          billable: undefined,
          page: null,
          limit: null,
        } satisfies IReportTime.IRequest,
      },
    );
  typia.assert(taskReport2);
  TestValidator.equals(
    "task report with null task filter total_hours",
    taskReport2.total_hours,
    expectedTotalHours,
  );
  // 6. Test employee filter
  const employeeFilterReport =
    await api.functional.hrmPlatform.member.reports.time.timeReport(
      memberConnection,
      {
        body: {
          from: timelogDate,
          to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          dimension: "project",
          employee_id: timelogWithTask1.employee.id,
          project_id: undefined,
          task_id: undefined,
          billable: undefined,
          page: null,
          limit: null,
        } satisfies IReportTime.IRequest,
      },
    );
  typia.assert(employeeFilterReport);
  // Verify only that employee's time appears in results
  TestValidator.equals(
    "employee filter report total_hours matches full amount",
    employeeFilterReport.total_hours,
    expectedTotalHours,
  );
  TestValidator.equals(
    "employee filter report billable_hours",
    employeeFilterReport.billable_hours,
    expectedBillableHours,
  );
  TestValidator.equals(
    "employee filter report non_billable_hours",
    employeeFilterReport.non_billable_hours,
    expectedNonBillableHours,
  );
  TestValidator.predicate(
    "employee filter report contains employee summary",
    employeeFilterReport.employee !== null,
  );
}
