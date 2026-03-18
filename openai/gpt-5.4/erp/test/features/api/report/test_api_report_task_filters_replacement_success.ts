import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReport";
import type { IHrmTimeTrackingReportEmployeeFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportEmployeeFilter";
import type { IHrmTimeTrackingReportProjectFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportProjectFilter";
import type { IHrmTimeTrackingReportTaskFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportTaskFilter";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_hrm_time_tracking_projects_create } from "../../../generate/generate_random_hrm_time_tracking_projects_create";
import { generate_random_hrm_time_tracking_projects_tasks_create } from "../../../generate/generate_random_hrm_time_tracking_projects_tasks_create";
import { generate_random_hrm_time_tracking_reports_create } from "../../../generate/generate_random_hrm_time_tracking_reports_create";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_report } from "../../../prepare/prepare_random_hrm_time_tracking_report";
import { prepare_random_hrm_time_tracking_report_employee_filter } from "../../../prepare/prepare_random_hrm_time_tracking_report_employee_filter";
import { prepare_random_hrm_time_tracking_report_project_filter } from "../../../prepare/prepare_random_hrm_time_tracking_report_project_filter";
import { prepare_random_hrm_time_tracking_report_task_filter } from "../../../prepare/prepare_random_hrm_time_tracking_report_task_filter";
import { prepare_random_hrm_time_tracking_task } from "../../../prepare/prepare_random_hrm_time_tracking_task";

export async function test_api_report_task_filters_replacement_success(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const project = await generate_random_hrm_time_tracking_projects_create(
    ownerConnection,
    {
      body: {
        name: `project-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        color_code: "#3366FF",
        status: "active",
        budget_hours: 120,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
      } satisfies IHrmTimeTrackingProject.ICreate,
    },
  );
  typia.assert(project);
  const oldTask = await generate_random_hrm_time_tracking_projects_tasks_create(
    ownerConnection,
    {
      params: { projectId: project.id },
      body: {
        title: `task-old-${RandomGenerator.alphabets(6)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        status: "open",
        priority: "medium",
        estimated_hours: 4,
        due_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(),
      } satisfies IHrmTimeTrackingTask.ICreate,
    },
  );
  typia.assert(oldTask);
  const replacementTasks = await ArrayUtil.asyncRepeat(2, async (index) => {
    const task = await generate_random_hrm_time_tracking_projects_tasks_create(
      ownerConnection,
      {
        params: { projectId: project.id },
        body: {
          title: `task-new-${index}-${RandomGenerator.alphabets(6)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          status: "open",
          priority: index === 0 ? "high" : "urgent",
          estimated_hours: index + 2,
          due_date: new Date(
            Date.now() + 1000 * 60 * 60 * 24 * (index + 5),
          ).toISOString(),
        } satisfies IHrmTimeTrackingTask.ICreate,
      },
    );
    typia.assert(task);
    return task;
  });
  const report = await generate_random_hrm_time_tracking_reports_create(
    ownerConnection,
    {
      body: {
        name: `report-${RandomGenerator.alphabets(8)}`,
        reportType: "time_report",
        rangeStartDate: new Date(
          Date.now() - 1000 * 60 * 60 * 24 * 30,
        ).toISOString(),
        rangeEndDate: new Date().toISOString(),
        groupBy: "task",
        billableOnly: true,
        includeNonBillable: false,
        taskFilters: [
          {
            task_id: oldTask.id,
          } satisfies IHrmTimeTrackingReportTaskFilter.ICreate,
        ],
      } satisfies IHrmTimeTrackingReport.ICreate,
    },
  );
  typia.assert(report);
  TestValidator.equals(
    "initial report has old task filter",
    report.taskFilters.length,
    1,
  );
  const initialTaskFilter = typia.assert<IHrmTimeTrackingReportTaskFilter>(
    report.taskFilters[0],
  );
  TestValidator.equals(
    "initial report task filter matches old task",
    initialTaskFilter.task.id,
    oldTask.id,
  );
  const updateBody = {
    taskFilters: replacementTasks.map(
      (task) =>
        ({
          task_id: task.id,
        }) satisfies IHrmTimeTrackingReportTaskFilter.ICreate,
    ),
  } satisfies IHrmTimeTrackingReportTaskFilter.IUpdateRequest;
  const replaced =
    await api.functional.hrmTimeTracking.reports.taskFilters.updateTaskFilters(
      ownerConnection,
      {
        reportId: report.id,
        body: updateBody,
      },
    );
  typia.assert(replaced);
  const returnedTaskIds = replaced.taskFilters.map((filter) => filter.task.id);
  const returnedFilterIds = replaced.taskFilters.map((filter) => filter.id);
  const submittedTaskIds = updateBody.taskFilters.map(
    (filter) => filter.task_id,
  );
  TestValidator.equals(
    "response report id matches",
    replaced.reportId,
    report.id,
  );
  TestValidator.equals(
    "replacement count matches submitted task count",
    replaced.taskFilters.length,
    submittedTaskIds.length,
  );
  TestValidator.equals(
    "submitted task ids are fully reflected",
    [...returnedTaskIds].sort(),
    [...submittedTaskIds].sort(),
  );
  TestValidator.predicate(
    "old task filter removed",
    returnedTaskIds.includes(oldTask.id) === false,
  );
  TestValidator.equals(
    "unique task rows per selected task",
    new Set(returnedTaskIds).size,
    returnedTaskIds.length,
  );
  TestValidator.equals(
    "unique filter row ids",
    new Set(returnedFilterIds).size,
    returnedFilterIds.length,
  );
  TestValidator.predicate(
    "every filter belongs to same report",
    replaced.taskFilters.every((filter) => filter.report.id === report.id),
  );
  TestValidator.predicate(
    "every returned task is from submitted replacement set",
    replaced.taskFilters.every((filter) =>
      submittedTaskIds.includes(filter.task.id),
    ),
  );
  TestValidator.predicate(
    "report name unchanged across returned child rows",
    replaced.taskFilters.every((filter) => filter.report.name === report.name),
  );
  TestValidator.predicate(
    "report type unchanged across returned child rows",
    replaced.taskFilters.every(
      (filter) => filter.report.report_type === report.reportType,
    ),
  );
  TestValidator.predicate(
    "range start unchanged across returned child rows",
    replaced.taskFilters.every(
      (filter) => filter.report.range_start_date === report.rangeStartDate,
    ),
  );
  TestValidator.predicate(
    "range end unchanged across returned child rows",
    replaced.taskFilters.every(
      (filter) => filter.report.range_end_date === report.rangeEndDate,
    ),
  );
  TestValidator.predicate(
    "group by unchanged across returned child rows",
    replaced.taskFilters.every(
      (filter) => filter.report.group_by === report.groupBy,
    ),
  );
  TestValidator.predicate(
    "billable only unchanged across returned child rows",
    replaced.taskFilters.every(
      (filter) => filter.report.billable_only === report.billableOnly,
    ),
  );
  TestValidator.predicate(
    "include non-billable unchanged across returned child rows",
    replaced.taskFilters.every(
      (filter) =>
        filter.report.include_non_billable === report.includeNonBillable,
    ),
  );
}
