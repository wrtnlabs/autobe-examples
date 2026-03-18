import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReport";
import type { IHrmTimeTrackingReportEmployeeFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportEmployeeFilter";
import type { IHrmTimeTrackingReportProjectFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportProjectFilter";
import type { IHrmTimeTrackingReportTaskFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingReportTaskFilter";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_employee_join } from "../../../authorize/authorize_employee_join";
import { authorize_employee_login } from "../../../authorize/authorize_employee_login";
import { authorize_employee_refresh } from "../../../authorize/authorize_employee_refresh";

export async function test_api_dashboard_personal_summary_for_selected_organization(
  connection: api.IConnection,
): Promise<void> {
  const employeeConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_employee_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  TestValidator.equals(
    "employee account remains active after join",
    authorized.deleted_at,
    null,
  );
  TestValidator.predicate(
    "authorized role organization has a non-empty name",
    authorized.role.organization.name.length > 0,
  );
  const dashboard =
    await api.functional.hrmTimeTracking.employee.dashboard.at(
      employeeConnection,
    );
  typia.assert(dashboard);
  TestValidator.predicate(
    "dashboard/report name is not empty",
    dashboard.name.length > 0,
  );
  TestValidator.predicate(
    "dashboard/report type is not empty",
    dashboard.reportType.length > 0,
  );
  TestValidator.equals(
    "dashboard organization matches authorized role organization",
    dashboard.organization.id,
    authorized.role.organization.id,
  );
  TestValidator.equals(
    "dashboard organization name matches authorized role organization",
    dashboard.organization.name,
    authorized.role.organization.name,
  );
  TestValidator.predicate(
    "report employee filters are scoped to the same report",
    dashboard.reportEmployeeFilters.every(
      (filter) => filter.report.id === dashboard.id,
    ),
  );
  TestValidator.predicate(
    "project filters are scoped to the same report",
    dashboard.projectFilters.every(
      (filter) => filter.report.id === dashboard.id,
    ),
  );
  TestValidator.predicate(
    "project filters belong to the same organization",
    dashboard.projectFilters.every(
      (filter) => filter.project.organization.id === dashboard.organization.id,
    ),
  );
  TestValidator.predicate(
    "task filters are scoped to the same report",
    dashboard.taskFilters.every((filter) => filter.report.id === dashboard.id),
  );
  TestValidator.predicate(
    "employee filter employees have non-empty emails",
    dashboard.reportEmployeeFilters.every(
      (filter) => filter.employee.email.length > 0,
    ),
  );
  TestValidator.predicate(
    "task filter tasks have titles",
    dashboard.taskFilters.every((filter) => filter.task.title.length > 0),
  );
  if (dashboard.rangeStartDate !== null && dashboard.rangeEndDate !== null) {
    TestValidator.predicate(
      "range start does not exceed range end",
      new Date(dashboard.rangeStartDate).getTime() <=
        new Date(dashboard.rangeEndDate).getTime(),
    );
  }
  TestValidator.predicate(
    "report createdAt is not after updatedAt",
    new Date(dashboard.createdAt).getTime() <=
      new Date(dashboard.updatedAt).getTime(),
  );
}
