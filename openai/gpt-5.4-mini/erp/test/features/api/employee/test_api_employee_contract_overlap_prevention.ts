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

export async function test_api_employee_contract_overlap_prevention(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234!Aa",
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  const employee = await generate_random_erp_hrm_time_member_employees_create(
    memberConnection,
    {
      body: {
        member_id: typia.random<string & tags.Format<"uuid">>(),
        role_id: typia.random<string & tags.Format<"uuid">>(),
        employment_type: "full-time",
      },
    },
  );
  typia.assert(employee);
  const firstStart = new Date(Date.UTC(2026, 0, 1, 0, 0, 0)).toISOString();
  const firstContract =
    await generate_random_erp_hrm_time_member_employees_contracts_create(
      memberConnection,
      {
        params: { employeeId: employee.id },
        body: {
          startDate: firstStart,
          endDate: null,
          payRate: 3000,
          payPeriod: "monthly",
          workingHoursPerWeek: 40,
          notes: "Initial active contract",
        } satisfies IErpHrmTimeEmployeeContract.ICreate,
      },
    );
  typia.assert(firstContract);
  const overlappingStart = new Date(
    Date.UTC(2026, 0, 2, 0, 0, 0),
  ).toISOString();
  await TestValidator.error(
    "should reject overlapping employee contract",
    async () => {
      await generate_random_erp_hrm_time_member_employees_contracts_create(
        memberConnection,
        {
          params: { employeeId: employee.id },
          body: {
            startDate: overlappingStart,
            endDate: null,
            payRate: 3200,
            payPeriod: "monthly",
            workingHoursPerWeek: 40,
            notes: "Overlapping contract attempt",
          } satisfies IErpHrmTimeEmployeeContract.ICreate,
        },
      );
    },
  );
  TestValidator.equals(
    "original contract start date remains unchanged",
    firstContract.startDate,
    firstStart,
  );
  TestValidator.equals(
    "original contract is still ongoing",
    firstContract.endDate,
    null,
  );
  TestValidator.equals(
    "original contract pay rate remains unchanged",
    firstContract.payRate,
    3000,
  );
  TestValidator.equals(
    "original contract pay period remains unchanged",
    firstContract.payPeriod,
    "monthly",
  );
  TestValidator.equals(
    "original contract working hours remain unchanged",
    firstContract.workingHoursPerWeek,
    40,
  );
}
