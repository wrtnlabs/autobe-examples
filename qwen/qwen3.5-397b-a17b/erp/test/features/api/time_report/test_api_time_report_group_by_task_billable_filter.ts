import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformInvitation";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimeReport";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTimeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimeReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_invitations_create } from "../../../generate/generate_random_hrm_platform_member_invitations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_members_create } from "../../../generate/generate_random_hrm_platform_member_projects_members_create";
import { generate_random_hrm_platform_member_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_member_projects_tasks_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_invitation } from "../../../prepare/prepare_random_hrm_platform_invitation";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

export async function test_api_time_report_group_by_task_billable_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create main member (report viewer)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create project for task organization
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#3498db",
        status: "active",
      },
    },
  );
  typia.assert(project);
  // 3. Create multiple tasks within the project
  const task1 = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        status: "open",
        priority: "high",
        description: RandomGenerator.content({ paragraphs: 1 }),
      },
      params: { projectId: project.id },
    },
  );
  typia.assert(task1);
  const task2 = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        status: "in-progress",
        priority: "medium",
        description: RandomGenerator.content({ paragraphs: 1 }),
      },
      params: { projectId: project.id },
    },
  );
  typia.assert(task2);
  const task3 = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        status: "open",
        priority: "low",
        description: RandomGenerator.content({ paragraphs: 1 }),
      },
      params: { projectId: project.id },
    },
  );
  typia.assert(task3);
  // 4. Create timelogs with varying billable statuses and task assignments
  const today = new Date();
  const dateFrom = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const dateTo = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  // Timelog 1: Task 1, billable, 60 minutes
  const timelog1 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        date: today.toISOString(),
        durationMinutes: 60,
        projectId: project.id,
        taskId: task1.id,
        billable: true,
        description: "Work on task 1",
      },
    },
  );
  typia.assert(timelog1);
  // Timelog 2: Task 1, non-billable, 30 minutes
  const timelog2 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        date: today.toISOString(),
        durationMinutes: 30,
        projectId: project.id,
        taskId: task1.id,
        billable: false,
        description: "Non-billable work on task 1",
      },
    },
  );
  typia.assert(timelog2);
  // Timelog 3: Task 2, billable, 90 minutes
  const timelog3 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        date: today.toISOString(),
        durationMinutes: 90,
        projectId: project.id,
        taskId: task2.id,
        billable: true,
        description: "Work on task 2",
      },
    },
  );
  typia.assert(timelog3);
  // Timelog 4: Task 2, non-billable, 45 minutes
  const timelog4 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        date: today.toISOString(),
        durationMinutes: 45,
        projectId: project.id,
        taskId: task2.id,
        billable: false,
        description: "Non-billable work on task 2",
      },
    },
  );
  typia.assert(timelog4);
  // Timelog 5: Project-level only (no task), billable, 120 minutes
  const timelog5 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        date: today.toISOString(),
        durationMinutes: 120,
        projectId: project.id,
        taskId: null,
        billable: true,
        description: "Project-level work without task",
      },
    },
  );
  typia.assert(timelog5);
  // Timelog 6: Task 3, billable, 60 minutes
  const timelog6 = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        date: today.toISOString(),
        durationMinutes: 60,
        projectId: project.id,
        taskId: task3.id,
        billable: true,
        description: "Work on task 3",
      },
    },
  );
  typia.assert(timelog6);
  // 5. Query time report with group='task'
  const reportAll = await api.functional.hrmPlatform.member.reports.time.index(
    memberConnection,
    {
      body: {
        dateFrom,
        dateTo,
        group: "task",
        projectIds: [project.id],
      } satisfies IHrmPlatformTimeReport.IRequest,
    },
  );
  typia.assert(reportAll);
  // Validate pagination structure
  TestValidator.predicate("has pagination", reportAll.pagination !== undefined);
  TestValidator.predicate("has data array", Array.isArray(reportAll.data));
  // Validate that only tasks with timelogs appear (task1, task2, task3 - 3 tasks)
  // Timelog without task should be excluded from task-grouped results
  TestValidator.predicate(
    "only tasks with timelogs appear",
    reportAll.data.length === 3,
  );
  // Validate task references and hours
  const task1Report = reportAll.data.find((r) => r.task?.id === task1.id);
  const task2Report = reportAll.data.find((r) => r.task?.id === task2.id);
  const task3Report = reportAll.data.find((r) => r.task?.id === task3.id);
  TestValidator.predicate("task1 in report", task1Report !== undefined);
  TestValidator.predicate("task2 in report", task2Report !== undefined);
  TestValidator.predicate("task3 in report", task3Report !== undefined);
  // Task 1: 60 + 30 = 90 minutes = 1.5 hours (60 billable, 30 non-billable)
  if (task1Report) {
    typia.assert(task1Report);
    TestValidator.equals("task1 total hours", task1Report.total_hours, 1.5);
    TestValidator.equals(
      "task1 billable hours",
      task1Report.billable_hours,
      1.0,
    );
    TestValidator.equals(
      "task1 non-billable hours",
      task1Report.non_billable_hours,
      0.5,
    );
    TestValidator.equals("task1 title", task1Report.task?.title, task1.title);
    TestValidator.equals(
      "task1 status",
      task1Report.task?.status,
      task1.status,
    );
  }
  // Task 2: 90 + 45 = 135 minutes = 2.25 hours (90 billable, 45 non-billable)
  if (task2Report) {
    typia.assert(task2Report);
    TestValidator.equals("task2 total hours", task2Report.total_hours, 2.25);
    TestValidator.equals(
      "task2 billable hours",
      task2Report.billable_hours,
      1.5,
    );
    TestValidator.equals(
      "task2 non-billable hours",
      task2Report.non_billable_hours,
      0.75,
    );
    TestValidator.equals("task2 title", task2Report.task?.title, task2.title);
    TestValidator.equals(
      "task2 status",
      task2Report.task?.status,
      task2.status,
    );
  }
  // Task 3: 60 minutes = 1.0 hours (60 billable, 0 non-billable)
  if (task3Report) {
    typia.assert(task3Report);
    TestValidator.equals("task3 total hours", task3Report.total_hours, 1.0);
    TestValidator.equals(
      "task3 billable hours",
      task3Report.billable_hours,
      1.0,
    );
    TestValidator.equals(
      "task3 non-billable hours",
      task3Report.non_billable_hours,
      0.0,
    );
    TestValidator.equals("task3 title", task3Report.task?.title, task3.title);
    TestValidator.equals(
      "task3 status",
      task3Report.task?.status,
      task3.status,
    );
  }
  // 6. Test billable=false filter - only non-billable hours
  const reportNonBillable =
    await api.functional.hrmPlatform.member.reports.time.index(
      memberConnection,
      {
        body: {
          dateFrom,
          dateTo,
          group: "task",
          projectIds: [project.id],
          billable: false,
        } satisfies IHrmPlatformTimeReport.IRequest,
      },
    );
  typia.assert(reportNonBillable);
  // Should only have tasks with non-billable timelogs (task1 and task2)
  TestValidator.predicate(
    "only tasks with non-billable hours",
    reportNonBillable.data.length === 2,
  );
  const task1NonBillable = reportNonBillable.data.find(
    (r) => r.task?.id === task1.id,
  );
  const task2NonBillable = reportNonBillable.data.find(
    (r) => r.task?.id === task2.id,
  );
  if (task1NonBillable) {
    typia.assert(task1NonBillable);
    TestValidator.equals(
      "task1 non-billable only",
      task1NonBillable.total_hours,
      0.5,
    );
    TestValidator.equals(
      "task1 billable is zero",
      task1NonBillable.billable_hours,
      0.0,
    );
  }
  if (task2NonBillable) {
    typia.assert(task2NonBillable);
    TestValidator.equals(
      "task2 non-billable only",
      task2NonBillable.total_hours,
      0.75,
    );
    TestValidator.equals(
      "task2 billable is zero",
      task2NonBillable.billable_hours,
      0.0,
    );
  }
  // 7. Test pagination with limit=2
  const reportPage1 =
    await api.functional.hrmPlatform.member.reports.time.index(
      memberConnection,
      {
        body: {
          dateFrom,
          dateTo,
          group: "task",
          projectIds: [project.id],
          page: 1,
          limit: 2,
        } satisfies IHrmPlatformTimeReport.IRequest,
      },
    );
  typia.assert(reportPage1);
  TestValidator.equals("page 1 has 2 items", reportPage1.data.length, 2);
  TestValidator.equals("page 1 current", reportPage1.pagination.current, 1);
  TestValidator.equals("page 1 limit", reportPage1.pagination.limit, 2);
  TestValidator.equals(
    "page 1 total records",
    reportPage1.pagination.records,
    3,
  );
  TestValidator.equals("page 1 total pages", reportPage1.pagination.pages, 2);
  const reportPage2 =
    await api.functional.hrmPlatform.member.reports.time.index(
      memberConnection,
      {
        body: {
          dateFrom,
          dateTo,
          group: "task",
          projectIds: [project.id],
          page: 2,
          limit: 2,
        } satisfies IHrmPlatformTimeReport.IRequest,
      },
    );
  typia.assert(reportPage2);
  TestValidator.equals("page 2 has 1 item", reportPage2.data.length, 1);
  TestValidator.equals("page 2 current", reportPage2.pagination.current, 2);
  // 8. Test empty date range returns empty results
  const reportEmpty =
    await api.functional.hrmPlatform.member.reports.time.index(
      memberConnection,
      {
        body: {
          dateFrom: "2020-01-01",
          dateTo: "2020-01-02",
          group: "task",
          projectIds: [project.id],
        } satisfies IHrmPlatformTimeReport.IRequest,
      },
    );
  typia.assert(reportEmpty);
  TestValidator.equals("empty range has 0 items", reportEmpty.data.length, 0);
  TestValidator.equals(
    "empty range records",
    reportEmpty.pagination.records,
    0,
  );
  TestValidator.equals("empty range pages", reportEmpty.pagination.pages, 0);
}
