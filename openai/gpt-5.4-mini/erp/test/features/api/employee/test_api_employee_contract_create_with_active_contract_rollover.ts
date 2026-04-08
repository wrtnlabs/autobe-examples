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

export async function test_api_employee_contract_create_with_active_contract_rollover(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234qwer!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://example.com",
      avatarImageUrl: null,
      phoneNumber: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const employeeConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: member.token.access,
    },
  };
  const employee = await generate_random_erp_hrm_time_member_employees_create(
    employeeConnection,
    {
      body: {
        member_id: member.id,
        role_id: typia.random<string & tags.Format<"uuid">>(),
        department_id: null,
        position_title: RandomGenerator.name(),
        employment_type: "full-time",
      },
    },
  );
  typia.assert(employee);
  const firstStart = "2026-01-01T00:00:00.000Z";
  const secondStart = "2026-02-01T00:00:00.000Z";
  const firstContract =
    await generate_random_erp_hrm_time_member_employees_contracts_create(
      employeeConnection,
      {
        params: { employeeId: employee.id },
        body: {
          startDate: firstStart,
          endDate: null,
          payRate: 3000,
          payPeriod: "monthly",
          workingHoursPerWeek: 40,
          notes: "Initial contract",
        } satisfies IErpHrmTimeEmployeeContract.ICreate,
      },
    );
  typia.assert(firstContract);
  TestValidator.equals(
    "first contract employee linkage",
    firstContract.employee.id,
    employee.id,
  );
  TestValidator.equals(
    "first contract start date",
    firstContract.startDate,
    firstStart,
  );
  TestValidator.equals(
    "first contract is initially active",
    firstContract.endDate,
    null,
  );
  const secondContract =
    await generate_random_erp_hrm_time_member_employees_contracts_create(
      employeeConnection,
      {
        params: { employeeId: employee.id },
        body: {
          startDate: secondStart,
          endDate: null,
          payRate: 3600,
          payPeriod: "monthly",
          workingHoursPerWeek: 40,
          notes: "Updated contract",
        } satisfies IErpHrmTimeEmployeeContract.ICreate,
      },
    );
  typia.assert(secondContract);
  TestValidator.equals(
    "second contract employee linkage",
    secondContract.employee.id,
    employee.id,
  );
  TestValidator.equals(
    "second contract start date",
    secondContract.startDate,
    secondStart,
  );
  TestValidator.equals(
    "second contract is active",
    secondContract.endDate,
    null,
  );
  TestValidator.notEquals(
    "contracts are different records",
    firstContract.id,
    secondContract.id,
  );
  TestValidator.predicate(
    "new contract has later effective start date",
    new Date(secondContract.startDate).getTime() >
      new Date(firstContract.startDate).getTime(),
  );
}
