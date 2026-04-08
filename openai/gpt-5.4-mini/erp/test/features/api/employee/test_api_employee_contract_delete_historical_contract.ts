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

export async function test_api_employee_contract_delete_historical_contract(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = `${RandomGenerator.alphabets(8)}@example.com`;
  const memberPassword = `P@ssw0rd${RandomGenerator.alphabets(4)}`;
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      displayName: RandomGenerator.name(),
      avatarImageUrl: null,
      phoneNumber: null,
      href: connection.host,
      referrer: connection.host,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorized);
  const employee = await generate_random_erp_hrm_time_member_employees_create(
    memberConnection,
    {
      body: {
        member_id: authorized.id,
        role_id: typia.random<string & tags.Format<"uuid">>(),
        employment_type: "full-time",
        position_title: RandomGenerator.name(),
      },
    },
  );
  typia.assert(employee);
  const historicalContract =
    await generate_random_erp_hrm_time_member_employees_contracts_create(
      memberConnection,
      {
        params: {
          employeeId: employee.id,
        },
        body: {
          startDate: new Date("2024-01-01T00:00:00.000Z").toISOString(),
          payRate: 3000,
          payPeriod: "monthly",
          workingHoursPerWeek: 40,
          notes: "historical contract",
        } satisfies IErpHrmTimeEmployeeContract.ICreate,
      },
    );
  typia.assert(historicalContract);
  const activeContract =
    await generate_random_erp_hrm_time_member_employees_contracts_create(
      memberConnection,
      {
        params: {
          employeeId: employee.id,
        },
        body: {
          startDate: new Date("2024-02-01T00:00:00.000Z").toISOString(),
          payRate: 3500,
          payPeriod: "monthly",
          workingHoursPerWeek: 40,
          notes: "active contract",
        } satisfies IErpHrmTimeEmployeeContract.ICreate,
      },
    );
  typia.assert(activeContract);
  TestValidator.notEquals(
    "historical and active contracts should be distinct",
    historicalContract.id,
    activeContract.id,
  );
  TestValidator.equals(
    "historical contract should belong to the created employee",
    historicalContract.employee.id,
    employee.id,
  );
  TestValidator.equals(
    "active contract should belong to the created employee",
    activeContract.employee.id,
    employee.id,
  );
  await api.functional.erpHrmTime.member.employees.contracts.erase(
    memberConnection,
    {
      employeeId: employee.id,
      employeeContractId: historicalContract.id,
    },
  );
}
