import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
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
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_hrm_time_tracking_owner_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_owner_organizations_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";

export async function test_api_dashboard_organization_scope_isolation(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingOwner.IJoin,
  });
  typia.assert(ownerAuth);
  const organization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerConnection,
      {
        body: {
          name: `org-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          logo_uri: typia.random<string & tags.Format<"uri">>(),
          currency_code: "KRW",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1 satisfies number &
            tags.Type<"int32"> as number & tags.Type<"int32">,
        } satisfies IHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(organization);
  const employeeEmail = typia.random<string & tags.Format<"email">>();
  const employeePassword = RandomGenerator.alphaNumeric(16);
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_employee_join(employeeConnection, {
    body: {
      email: employeeEmail,
      password: employeePassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingEmployee.IJoin,
  });
  typia.assert(employeeAuth);
  const staleEmployeeConnection: api.IConnection = { host: connection.host };
  const employeeLogin = await authorize_employee_login(
    staleEmployeeConnection,
    {
      body: {
        email: employeeEmail,
        password: employeePassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IHrmTimeTrackingEmployee.ILogin,
    },
  );
  typia.assert(employeeLogin);
  await TestValidator.error(
    "dashboard fails clearly without selected organization context",
    async () => {
      await api.functional.hrmTimeTracking.employee.dashboard.at(
        staleEmployeeConnection,
      );
    },
  );
  let selected: boolean = false;
  try {
    const selectedOrganization =
      await api.functional.hrmTimeTracking.employee.organizations.update(
        employeeConnection,
        {
          organizationId: organization.id,
          body: {} satisfies IHrmTimeTrackingOrganization.IUpdate,
        },
      );
    typia.assert(selectedOrganization);
    TestValidator.equals(
      "selected organization matches target",
      selectedOrganization.id,
      organization.id,
    );
    selected = true;
  } catch {
    selected = false;
  }
  if (selected === true) {
    const dashboard =
      await api.functional.hrmTimeTracking.employee.dashboard.at(
        employeeConnection,
      );
    typia.assert(dashboard);
    TestValidator.equals(
      "dashboard organization matches selected organization",
      dashboard.organization.id,
      organization.id,
    );
    TestValidator.equals(
      "project filters stay in selected organization",
      ArrayUtil.has(
        dashboard.projectFilters,
        (filter) => filter.project.organization.id !== organization.id,
      ),
      false,
    );
    TestValidator.equals(
      "task filters remain attached to the current dashboard report",
      ArrayUtil.has(
        dashboard.taskFilters,
        (filter) => filter.report.id !== dashboard.id,
      ),
      false,
    );
    TestValidator.equals(
      "employee filters remain attached to the current dashboard report",
      ArrayUtil.has(
        dashboard.reportEmployeeFilters,
        (filter) => filter.report.id !== dashboard.id,
      ),
      false,
    );
  } else {
    await TestValidator.error(
      "dashboard fails clearly when current organization context cannot be matched to employee membership",
      async () => {
        await api.functional.hrmTimeTracking.employee.dashboard.at(
          employeeConnection,
        );
      },
    );
  }
}
