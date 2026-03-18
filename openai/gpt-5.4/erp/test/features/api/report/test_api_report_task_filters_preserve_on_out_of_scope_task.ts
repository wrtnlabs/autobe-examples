import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
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

import { generate_random_hrm_time_tracking_projects_create } from "../../../generate/generate_random_hrm_time_tracking_projects_create";
import { generate_random_hrm_time_tracking_projects_tasks_create } from "../../../generate/generate_random_hrm_time_tracking_projects_tasks_create";
import { generate_random_hrm_time_tracking_reports_create } from "../../../generate/generate_random_hrm_time_tracking_reports_create";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_report } from "../../../prepare/prepare_random_hrm_time_tracking_report";
import { prepare_random_hrm_time_tracking_report_employee_filter } from "../../../prepare/prepare_random_hrm_time_tracking_report_employee_filter";
import { prepare_random_hrm_time_tracking_report_project_filter } from "../../../prepare/prepare_random_hrm_time_tracking_report_project_filter";
import { prepare_random_hrm_time_tracking_report_task_filter } from "../../../prepare/prepare_random_hrm_time_tracking_report_task_filter";
import { prepare_random_hrm_time_tracking_task } from "../../../prepare/prepare_random_hrm_time_tracking_task";

export async function test_api_report_task_filters_preserve_on_out_of_scope_task(
  connection: api.IConnection,
): Promise<void> {
  const employeeConnection: api.IConnection = { host: connection.host };
  const project = await generate_random_hrm_time_tracking_projects_create(
    employeeConnection,
    {
      body: {
        name: `project-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#112233",
        status: "active",
        budget_hours: 120,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 86400000).toISOString(),
      },
    },
  );
  typia.assert(project);
  const initialTask =
    await generate_random_hrm_time_tracking_projects_tasks_create(
      employeeConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          title: `task-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          status: "open",
          priority: "high",
          estimated_hours: 8,
          due_date: new Date(Date.now() + 172800000).toISOString(),
          hrm_time_tracking_employee_id: null,
          parent_id: null,
        },
      },
    );
  typia.assert(initialTask);
  const replacementTask =
    await generate_random_hrm_time_tracking_projects_tasks_create(
      employeeConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          title: `task-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          status: "in-progress",
          priority: "urgent",
          estimated_hours: 13,
          due_date: new Date(Date.now() + 259200000).toISOString(),
          hrm_time_tracking_employee_id: null,
          parent_id: null,
        },
      },
    );
  typia.assert(replacementTask);
  const report = await generate_random_hrm_time_tracking_reports_create(
    employeeConnection,
    {
      body: {
        name: `report-${RandomGenerator.alphabets(8)}`,
        reportType: "time_report",
        rangeStartDate: new Date().toISOString(),
        rangeEndDate: new Date(Date.now() + 604800000).toISOString(),
        groupBy: null,
        billableOnly: null,
        includeNonBillable: null,
        taskFilters: [
          {
            task_id: initialTask.id,
          },
        ],
      },
    },
  );
  typia.assert(report);
  TestValidator.equals(
    "initial report task filter count",
    report.taskFilters.length,
    1,
  );
  TestValidator.equals(
    "initial report task filter task id",
    report.taskFilters[0].task.id,
    initialTask.id,
  );
  const invalidTaskId = typia.random<string & tags.Format<"uuid">>();
  const mixedReplacement = {
    taskFilters: [
      {
        task_id: replacementTask.id,
      },
      {
        task_id: invalidTaskId,
      },
    ],
  } satisfies IHrmTimeTrackingReportTaskFilter.IUpdateRequest;
  await TestValidator.error(
    "mixed replacement with out-of-scope task must fail atomically",
    async () => {
      await api.functional.hrmTimeTracking.reports.taskFilters.updateTaskFilters(
        employeeConnection,
        {
          reportId: report.id,
          body: mixedReplacement,
        },
      );
    },
  );
  TestValidator.equals(
    "locally preserved original task filter count remains unchanged",
    report.taskFilters.length,
    1,
  );
  TestValidator.equals(
    "locally preserved original task filter id remains unchanged",
    report.taskFilters[0].task.id,
    initialTask.id,
  );
  const validReplacement = {
    taskFilters: [
      {
        task_id: initialTask.id,
      },
      {
        task_id: replacementTask.id,
      },
    ],
  } satisfies IHrmTimeTrackingReportTaskFilter.IUpdateRequest;
  const updated =
    await api.functional.hrmTimeTracking.reports.taskFilters.updateTaskFilters(
      employeeConnection,
      {
        reportId: report.id,
        body: validReplacement,
      },
    );
  typia.assert(updated);
  TestValidator.equals("updated report id", updated.reportId, report.id);
  TestValidator.equals(
    "updated task filter count",
    updated.taskFilters.length,
    2,
  );
  const expectedTaskIds = [initialTask.id, replacementTask.id].sort();
  const actualTaskIds = updated.taskFilters
    .map((filter) => filter.task.id)
    .sort();
  TestValidator.equals(
    "updated task filter ids match requested valid replacement set",
    actualTaskIds,
    expectedTaskIds,
  );
}
