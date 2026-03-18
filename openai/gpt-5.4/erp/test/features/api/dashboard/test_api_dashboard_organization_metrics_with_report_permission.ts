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

export async function test_api_dashboard_organization_metrics_with_report_permission(
  connection: api.IConnection,
): Promise<void> {
  const employeeConnection: api.IConnection = { host: connection.host };
  const authorized: IHrmTimeTrackingEmployee.IAuthorized =
    await authorize_employee_join(employeeConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IHrmTimeTrackingEmployee.IJoin,
    });
  typia.assert<IHrmTimeTrackingEmployee.IAuthorized>(authorized);
  const dashboard: IHrmTimeTrackingReport =
    await api.functional.hrmTimeTracking.employee.dashboard.at(
      employeeConnection,
    );
  typia.assert<IHrmTimeTrackingReport>(dashboard);
  TestValidator.equals(
    "dashboard organization matches authorized organization",
    dashboard.organization.id,
    authorized.role.organization.id,
  );
  dashboard.reportEmployeeFilters.forEach((filter) => {
    typia.assert<IHrmTimeTrackingReportEmployeeFilter>(filter);
    TestValidator.equals(
      "employee filter report references dashboard report",
      filter.report.id,
      dashboard.id,
    );
  });
  dashboard.projectFilters.forEach((filter) => {
    typia.assert<IHrmTimeTrackingReportProjectFilter>(filter);
    TestValidator.equals(
      "project filter report references dashboard report",
      filter.report.id,
      dashboard.id,
    );
    TestValidator.equals(
      "project filter report organization matches dashboard organization",
      filter.project.organization.id,
      dashboard.organization.id,
    );
    TestValidator.equals(
      "project filter project organization matches authorized organization",
      filter.project.organization.id,
      authorized.role.organization.id,
    );
  });
  dashboard.taskFilters.forEach((filter) => {
    typia.assert<IHrmTimeTrackingReportTaskFilter>(filter);
    TestValidator.equals(
      "task filter report references dashboard report",
      filter.report.id,
      dashboard.id,
    );
  });
}
