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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingReportProjectFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingReportProjectFilter";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_hrm_time_tracking_owner_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_owner_organizations_create";
import { generate_random_hrm_time_tracking_reports_create } from "../../../generate/generate_random_hrm_time_tracking_reports_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_report } from "../../../prepare/prepare_random_hrm_time_tracking_report";
import { prepare_random_hrm_time_tracking_report_employee_filter } from "../../../prepare/prepare_random_hrm_time_tracking_report_employee_filter";
import { prepare_random_hrm_time_tracking_report_project_filter } from "../../../prepare/prepare_random_hrm_time_tracking_report_project_filter";
import { prepare_random_hrm_time_tracking_report_task_filter } from "../../../prepare/prepare_random_hrm_time_tracking_report_task_filter";

export async function test_api_report_project_filters_browse_current_report(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  const organization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          logo_uri: typia.random<string & tags.Format<"uri">>(),
          currency_code: "KRW",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  const firstReportBody = {
    name: `report-${RandomGenerator.alphaNumeric(8)}`,
    reportType: "time_report",
    rangeStartDate: new Date().toISOString(),
    rangeEndDate: new Date(Date.now() + 86400000).toISOString(),
    groupBy: "project",
    billableOnly: false,
    includeNonBillable: true,
    projectFilters: [
      {
        projectIds: [typia.random<string & tags.Format<"uuid">>()],
      },
      {
        projectIds: [typia.random<string & tags.Format<"uuid">>()],
      },
    ],
  } satisfies IHrmTimeTrackingReport.ICreate;
  const firstReport = await generate_random_hrm_time_tracking_reports_create(
    ownerConnection,
    {
      body: firstReportBody,
    },
  );
  typia.assert(firstReport);
  const secondReportBody = {
    name: `report-${RandomGenerator.alphaNumeric(8)}`,
    reportType: "time_report",
    rangeStartDate: new Date().toISOString(),
    rangeEndDate: new Date(Date.now() + 172800000).toISOString(),
    groupBy: "project",
    billableOnly: false,
    includeNonBillable: true,
    projectFilters: [
      {
        projectIds: [typia.random<string & tags.Format<"uuid">>()],
      },
    ],
  } satisfies IHrmTimeTrackingReport.ICreate;
  const secondReport = await generate_random_hrm_time_tracking_reports_create(
    ownerConnection,
    {
      body: secondReportBody,
    },
  );
  typia.assert(secondReport);
  const expectedFirstIds = firstReport.projectFilters.map(
    (filter) => filter.id,
  );
  const expectedSecondIds = secondReport.projectFilters.map(
    (filter) => filter.id,
  );
  const request = {
    page: 1,
    limit: 100,
    sort: "-created_at",
  } satisfies IHrmTimeTrackingReportProjectFilter.IRequest;
  const page =
    await api.functional.hrmTimeTracking.reports.projectFilters.index(
      ownerConnection,
      {
        reportId: firstReport.id,
        body: request,
      },
    );
  typia.assert(page);
  TestValidator.equals(
    "pagination current page matches request",
    page.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "pagination limit matches request",
    page.pagination.limit,
    request.limit,
  );
  TestValidator.equals(
    "record count matches first report filters",
    page.pagination.records,
    firstReport.projectFilters.length,
  );
  TestValidator.equals(
    "page count is coherent",
    page.pagination.pages,
    Math.ceil(page.pagination.records / page.pagination.limit),
  );
  TestValidator.equals(
    "returned row count matches first report filters",
    page.data.length,
    firstReport.projectFilters.length,
  );
  TestValidator.predicate(
    "all returned filters belong to first report",
    page.data.every((filter) => expectedFirstIds.includes(filter.id)),
  );
  TestValidator.predicate(
    "second report filters are excluded",
    page.data.every(
      (filter) => expectedSecondIds.includes(filter.id) === false,
    ),
  );
  TestValidator.predicate(
    "all returned filters are active",
    page.data.every((filter) => filter.deleted_at === null),
  );
  TestValidator.predicate(
    "all returned filters belong to the created organization",
    page.data.every(
      (filter) => filter.project.organization.id === organization.id,
    ),
  );
  const expectedOrder = [...firstReport.projectFilters]
    .sort((x, y) => {
      const time =
        new Date(y.created_at).getTime() - new Date(x.created_at).getTime();
      return time !== 0 ? time : y.id.localeCompare(x.id);
    })
    .map((filter) => filter.id);
  TestValidator.equals(
    "returned ids follow requested sort order",
    page.data.map((filter) => filter.id),
    expectedOrder,
  );
}
