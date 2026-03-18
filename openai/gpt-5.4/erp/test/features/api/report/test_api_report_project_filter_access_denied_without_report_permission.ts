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
import { generate_random_hrm_time_tracking_reports_create } from "../../../generate/generate_random_hrm_time_tracking_reports_create";
import { generate_random_hrm_time_tracking_reports_project_filters_create } from "../../../generate/generate_random_hrm_time_tracking_reports_project_filters_create";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_report } from "../../../prepare/prepare_random_hrm_time_tracking_report";
import { prepare_random_hrm_time_tracking_report_employee_filter } from "../../../prepare/prepare_random_hrm_time_tracking_report_employee_filter";
import { prepare_random_hrm_time_tracking_report_project_filter } from "../../../prepare/prepare_random_hrm_time_tracking_report_project_filter";
import { prepare_random_hrm_time_tracking_report_task_filter } from "../../../prepare/prepare_random_hrm_time_tracking_report_task_filter";

export async function test_api_report_project_filter_access_denied_without_report_permission(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(owner);
  const project = await generate_random_hrm_time_tracking_projects_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#" + RandomGenerator.alphaNumeric(6),
        status: "active",
        budget_hours: 40,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
      },
    },
  );
  typia.assert(project);
  const report = await generate_random_hrm_time_tracking_reports_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        reportType: "time_report",
        rangeStartDate: new Date().toISOString(),
        rangeEndDate: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
        groupBy: "project",
        billableOnly: false,
        includeNonBillable: true,
      },
    },
  );
  typia.assert(report);
  const updatedReport =
    await generate_random_hrm_time_tracking_reports_project_filters_create(
      ownerConnection,
      {
        params: {
          reportId: report.id,
        },
        body: {
          projectIds: [project.id],
        },
      },
    );
  typia.assert(updatedReport);
  const maybeCreatedProjectFilter = updatedReport.projectFilters.find(
    (filter) => filter.project.id === project.id,
  );
  if (maybeCreatedProjectFilter === undefined) {
    throw new Error("Failed to create project filter.");
  }
  const createdProjectFilter = maybeCreatedProjectFilter;
  TestValidator.equals(
    "project filter belongs to created report",
    createdProjectFilter.report.id,
    report.id,
  );
  TestValidator.equals(
    "project filter belongs to created project",
    createdProjectFilter.project.id,
    project.id,
  );
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "access denied without report permission",
    [401, 403, 404],
    async () => {
      await api.functional.hrmTimeTracking.reports.projectFilters.at(
        unauthorizedConnection,
        {
          reportId: report.id,
          projectFilterId: createdProjectFilter.id,
        },
      );
    },
  );
}
