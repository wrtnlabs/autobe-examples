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

export async function test_api_report_task_filters_clear_all(
  connection: api.IConnection,
): Promise<void> {
  const actorConnection: api.IConnection = { host: connection.host };
  const project = await generate_random_hrm_time_tracking_projects_create(
    actorConnection,
    {
      body: {
        name: `project-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#123abc",
        status: "active",
      } satisfies IHrmTimeTrackingProject.ICreate,
    },
  );
  typia.assert(project);
  const task = await generate_random_hrm_time_tracking_projects_tasks_create(
    actorConnection,
    {
      params: {
        projectId: project.id,
      },
      body: {
        title: `task-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "open",
        priority: "medium",
      } satisfies IHrmTimeTrackingTask.ICreate,
    },
  );
  typia.assert(task);
  const report = await generate_random_hrm_time_tracking_reports_create(
    actorConnection,
    {
      body: {
        name: `report-${RandomGenerator.alphabets(8)}`,
        reportType: "time_report",
      } satisfies IHrmTimeTrackingReport.ICreate,
    },
  );
  typia.assert(report);
  const initialUpdate: IHrmTimeTrackingReportTaskFilter.ICollection =
    await api.functional.hrmTimeTracking.reports.taskFilters.updateTaskFilters(
      actorConnection,
      {
        reportId: report.id,
        body: {
          taskFilters: [
            {
              task_id: task.id,
            },
          ],
        } satisfies IHrmTimeTrackingReportTaskFilter.IUpdateRequest,
      },
    );
  typia.assert(initialUpdate);
  TestValidator.equals(
    "initial update targets same report",
    initialUpdate.reportId,
    report.id,
  );
  TestValidator.equals(
    "initial update creates one task filter",
    initialUpdate.taskFilters.length,
    1,
  );
  TestValidator.equals(
    "initial update uses created task",
    initialUpdate.taskFilters[0]!.task.id,
    task.id,
  );
  const cleared: IHrmTimeTrackingReportTaskFilter.ICollection =
    await api.functional.hrmTimeTracking.reports.taskFilters.updateTaskFilters(
      actorConnection,
      {
        reportId: report.id,
        body: {
          taskFilters: [],
        } satisfies IHrmTimeTrackingReportTaskFilter.IUpdateRequest,
      },
    );
  typia.assert(cleared);
  TestValidator.equals(
    "cleared response targets same report",
    cleared.reportId,
    report.id,
  );
  TestValidator.equals(
    "all task filters are cleared",
    cleared.taskFilters.length,
    0,
  );
}
