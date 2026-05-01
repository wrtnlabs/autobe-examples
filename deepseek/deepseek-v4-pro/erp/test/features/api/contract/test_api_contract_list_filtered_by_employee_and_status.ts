import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmContract";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmPermission";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmContract";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_employees_contracts_create } from "../../../generate/generate_random_erp_hrm_member_employees_contracts_create";
import { generate_random_erp_hrm_member_employees_create } from "../../../generate/generate_random_erp_hrm_member_employees_create";
import { generate_random_erp_hrm_roles_create } from "../../../generate/generate_random_erp_hrm_roles_create";
import { prepare_random_erp_hrm_contract } from "../../../prepare/prepare_random_erp_hrm_contract";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

/**
 * Test contract listing endpoint filtering by employee, pay period, active status, and combined criteria.
 *
 * Validates that the contract index endpoint correctly applies each filter independently and in combination. The test creates a member, custom role, employee, and an ongoing monthly contract, then exercises four filter scenarios to confirm correct scoping and intersection logic.
 *
 * 1. Join as a new member to authenticate and establish organization context.
 * 2. Create a custom role with a random permission set.
 * 3. Create an employee assigned to the custom role.
 * 4. Create an ongoing employment contract for the employee with monthly pay period, pay rate 5000, and 40 working hours per week.
 * 5. Filter by employeeId: verify all returned contracts belong to the specified employee.
 * 6. Filter by payPeriod "monthly": verify only monthly contracts appear, excluding other periods.
 * 7. Filter by status "active": verify only active contracts appear and the created contract is included.
 * 8. Combined filter (employeeId + active status): verify intersection of both criteria.
 */
export async function test_api_contract_list_filtered_by_employee_and_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create custom role
  const role = await generate_random_erp_hrm_roles_create(memberConnection, {});
  typia.assert(role);
  // 3. Create employee with the role
  const employee = await generate_random_erp_hrm_member_employees_create(
    memberConnection,
    {
      body: { erp_hrm_role_id: role.id },
    },
  );
  typia.assert(employee);
  // 4. Create ongoing monthly contract
  const contract =
    await generate_random_erp_hrm_member_employees_contracts_create(
      memberConnection,
      {
        body: {
          pay_period: "monthly",
          pay_rate: 5000,
          working_hours_per_week: 40,
          end_date: null,
        },
        params: { employeeId: employee.id },
      },
    );
  typia.assert(contract);
  // 5. Filter by employeeId
  const pageByEmployee = await api.functional.erpHrm.member.contracts.index(
    memberConnection,
    {
      body: { employeeId: employee.id } satisfies IErpHrmContract.IRequest,
    },
  );
  typia.assert(pageByEmployee);
  TestValidator.predicate(
    "all contracts belong to specified employee",
    pageByEmployee.data.every((c) => c.employee.id === employee.id),
  );
  TestValidator.predicate(
    "at least one contract returned",
    pageByEmployee.data.length >= 1,
  );
  // 6. Filter by payPeriod
  const pageByPayPeriod = await api.functional.erpHrm.member.contracts.index(
    memberConnection,
    {
      body: {
        payPeriod: ["monthly"] as const,
      } satisfies IErpHrmContract.IRequest,
    },
  );
  typia.assert(pageByPayPeriod);
  TestValidator.predicate(
    "all contracts have monthly pay period",
    pageByPayPeriod.data.every((c) => c.pay_period === "monthly"),
  );
  TestValidator.predicate(
    "created contract found in monthly results",
    pageByPayPeriod.data.some((c) => c.id === contract.id),
  );
  // 7. Filter by active status
  const pageByStatus = await api.functional.erpHrm.member.contracts.index(
    memberConnection,
    {
      body: { status: "active" } satisfies IErpHrmContract.IRequest,
    },
  );
  typia.assert(pageByStatus);
  TestValidator.predicate(
    "all contracts are active",
    pageByStatus.data.every((c) => c.is_active === true),
  );
  TestValidator.predicate(
    "created contract appears in active results",
    pageByStatus.data.some((c) => c.id === contract.id),
  );
  // 8. Combined filters
  const pageCombined = await api.functional.erpHrm.member.contracts.index(
    memberConnection,
    {
      body: {
        employeeId: employee.id,
        status: "active",
      } satisfies IErpHrmContract.IRequest,
    },
  );
  typia.assert(pageCombined);
  TestValidator.predicate(
    "all contracts match both employee and active status",
    pageCombined.data.every(
      (c) => c.employee.id === employee.id && c.is_active === true,
    ),
  );
  TestValidator.predicate(
    "created contract found in combined results",
    pageCombined.data.some((c) => c.id === contract.id),
  );
}
