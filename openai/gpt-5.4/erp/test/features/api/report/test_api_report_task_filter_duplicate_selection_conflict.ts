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

import { generate_random_hrm_time_tracking_reports_create } from "../../../generate/generate_random_hrm_time_tracking_reports_create";
import { generate_random_hrm_time_tracking_reports_task_filters_create } from "../../../generate/generate_random_hrm_time_tracking_reports_task_filters_create";
import { prepare_random_hrm_time_tracking_report } from "../../../prepare/prepare_random_hrm_time_tracking_report";
import { prepare_random_hrm_time_tracking_report_employee_filter } from "../../../prepare/prepare_random_hrm_time_tracking_report_employee_filter";
import { prepare_random_hrm_time_tracking_report_project_filter } from "../../../prepare/prepare_random_hrm_time_tracking_report_project_filter";
import { prepare_random_hrm_time_tracking_report_task_filter } from "../../../prepare/prepare_random_hrm_time_tracking_report_task_filter";

export async function test_api_report_task_filter_duplicate_selection_conflict(
  connection: api.IConnection,
): Promise<void> {
  const userConnection: api.IConnection = {
    host: connection.host,
  };
  const seedReport = await generate_random_hrm_time_tracking_reports_create(
    userConnection,
    {},
  );
  typia.assert(seedReport);
  TestValidator.predicate(
    "seed report has at least one task filter",
    seedReport.taskFilters.length > 0,
  );
  const seededTaskFilter: IHrmTimeTrackingReportTaskFilter = (() => {
    const first = seedReport.taskFilters[0];
    if (first === undefined)
      throw new Error("Seed report must provide at least one task filter.");
    return first;
  })();
  TestValidator.equals(
    "seeded task filter belongs to seed report",
    seededTaskFilter.report.id,
    seedReport.id,
  );
  const report = await generate_random_hrm_time_tracking_reports_create(
    userConnection,
    {
      body: {
        taskFilters: [],
      },
    },
  );
  typia.assert(report);
  TestValidator.equals(
    "target report starts without task filters in creation snapshot",
    report.taskFilters.length,
    0,
  );
  const body = {
    task_id: seededTaskFilter.task.id,
  } satisfies IHrmTimeTrackingReportTaskFilter.ICreate;
  const created =
    await generate_random_hrm_time_tracking_reports_task_filters_create(
      userConnection,
      {
        params: {
          reportId: report.id,
        },
        body,
      },
    );
  typia.assert(created);
  TestValidator.equals(
    "created filter report id",
    created.report.id,
    report.id,
  );
  TestValidator.equals(
    "created filter task id",
    created.task.id,
    seededTaskFilter.task.id,
  );
  TestValidator.equals(
    "created filter deleted_at is null",
    created.deleted_at,
    null,
  );
  const createdId = created.id;
  const createdReportId = created.report.id;
  const createdTaskId = created.task.id;
  const createdDeletedAt = created.deleted_at;
  const createdCreatedAt = created.created_at;
  const createdUpdatedAt = created.updated_at;
  await TestValidator.httpError(
    "duplicate task selection is rejected as conflict",
    409,
    async () => {
      await generate_random_hrm_time_tracking_reports_task_filters_create(
        userConnection,
        {
          params: {
            reportId: report.id,
          },
          body,
        },
      );
    },
  );
  TestValidator.equals(
    "original created filter id remains intact",
    created.id,
    createdId,
  );
  TestValidator.equals(
    "original created filter report remains intact",
    created.report.id,
    createdReportId,
  );
  TestValidator.equals(
    "original created filter task remains intact",
    created.task.id,
    createdTaskId,
  );
  TestValidator.equals(
    "original created filter deleted_at remains null",
    created.deleted_at,
    createdDeletedAt,
  );
  TestValidator.equals(
    "original created filter created_at remains intact",
    created.created_at,
    createdCreatedAt,
  );
  TestValidator.equals(
    "original created filter updated_at remains intact",
    created.updated_at,
    createdUpdatedAt,
  );
  TestValidator.equals(
    "target report creation snapshot remains unchanged in memory",
    report.taskFilters.length,
    0,
  );
}
