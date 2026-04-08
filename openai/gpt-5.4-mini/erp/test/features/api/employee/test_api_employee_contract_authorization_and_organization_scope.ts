import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeContract";
import type { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_member_employees_contracts_create } from "../../../generate/generate_random_erp_hrm_time_member_employees_contracts_create";
import { generate_random_erp_hrm_time_member_employees_create } from "../../../generate/generate_random_erp_hrm_time_member_employees_create";
import { prepare_random_erp_hrm_time_employee_contract } from "../../../prepare/prepare_random_erp_hrm_time_employee_contract";
import { prepare_random_erp_hrm_time_employee_dashboard_summary } from "../../../prepare/prepare_random_erp_hrm_time_employee_dashboard_summary";

export async function test_api_employee_contract_authorization_and_organization_scope(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const outsiderConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@example.com` satisfies string,
      password: "Password123!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/landing",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(ownerAuth);
  const outsiderAuth = await authorize_member_join(outsiderConnection, {
    body: {
      email:
        `${RandomGenerator.alphaNumeric(8)}-other@example.com` satisfies string,
      password: "Password123!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/landing",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(outsiderAuth);
  const employee = await generate_random_erp_hrm_time_member_employees_create(
    ownerConnection,
    {
      body: {
        member_id: ownerAuth.id,
        role_id: typia.random<string & tags.Format<"uuid">>(),
        employment_type: "full-time",
      } satisfies IErpHrmTimeEmployeeDashboardSummary.ICreate,
    },
  );
  typia.assert(employee);
  const contractBody = {
    startDate: new Date(Date.UTC(2026, 0, 1)).toISOString(),
    payRate: 50000,
    payPeriod: "monthly",
    workingHoursPerWeek: 40,
    notes: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IErpHrmTimeEmployeeContract.ICreate;
  const created =
    await generate_random_erp_hrm_time_member_employees_contracts_create(
      ownerConnection,
      {
        params: { employeeId: employee.id },
        body: contractBody,
      },
    );
  typia.assert(created);
  TestValidator.equals(
    "contract employee id",
    created.employee.id,
    employee.id,
  );
  TestValidator.equals(
    "contract start date",
    created.startDate,
    contractBody.startDate,
  );
  TestValidator.equals(
    "contract pay rate",
    created.payRate,
    contractBody.payRate,
  );
  TestValidator.equals(
    "contract pay period",
    created.payPeriod,
    contractBody.payPeriod,
  );
  TestValidator.equals(
    "contract working hours",
    created.workingHoursPerWeek,
    contractBody.workingHoursPerWeek,
  );
  await TestValidator.error(
    "cross-organization contract creation is rejected",
    async () => {
      await generate_random_erp_hrm_time_member_employees_contracts_create(
        outsiderConnection,
        {
          params: { employeeId: employee.id },
          body: {
            startDate: new Date(Date.UTC(2026, 1, 1)).toISOString(),
            payRate: 60000,
            payPeriod: "monthly",
            workingHoursPerWeek: 40,
            notes: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies IErpHrmTimeEmployeeContract.ICreate,
        },
      );
    },
  );
  TestValidator.equals(
    "contract employee preserved",
    created.employee.id,
    employee.id,
  );
  TestValidator.equals(
    "contract pay period preserved",
    created.payPeriod,
    contractBody.payPeriod,
  );
  TestValidator.equals(
    "contract pay rate preserved",
    created.payRate,
    contractBody.payRate,
  );
  TestValidator.equals(
    "contract notes preserved",
    created.notes,
    contractBody.notes,
  );
}
