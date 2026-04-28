import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeContract";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employees_contracts_create } from "../../../generate/generate_random_hrm_platform_member_employees_contracts_create";
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { generate_random_hrm_platform_member_roles_create } from "../../../generate/generate_random_hrm_platform_member_roles_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_employee_contract } from "../../../prepare/prepare_random_hrm_platform_employee_contract";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";

/**
 * Test successful creation of a new employment contract for an employee with no existing active contract.
 *
 * Validates the complete contract creation flow including member authentication, custom role setup, employee invitation, and contract establishment. Ensures that the contract is created with all required compensation terms and working conditions, and that the response includes all expected fields.
 *
 * Special attention is given to verifying that the contract's end_date is null for an open-ended employment relationship, and that the employee relation correctly references the created employee.
 *
 * 1. Member authenticates by joining the platform.
 * 2. A custom role is created for organization-scoped authorization.
 * 3. An employee is invited and assigned to the custom role.
 * 4. A new employment contract is created with start_date, pay_rate, pay_period, and working_hours_per_week.
 * 5. Contract response is validated for type correctness and business rule compliance.
 * 6. Contract fields are verified: end_date is null (open-ended), employee ID matches the created employee.
 */
export async function test_api_employee_contract_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member by joining the platform
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(authorizedMember);
  // 2. Create a custom role for the organization
  const role = await generate_random_hrm_platform_member_roles_create(
    memberConnection,
    { body: {} },
  );
  typia.assert(role);
  // 3. Create an employee assigned to the custom role
  const employee = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    {
      body: {
        memberId: authorizedMember.id,
        roleId: role.id,
        employmentType: "full-time",
      },
    },
  );
  typia.assert(employee);
  // 4. Create a new employment contract for the employee
  const contract =
    await generate_random_hrm_platform_member_employees_contracts_create(
      memberConnection,
      {
        params: { employeeId: employee.id },
        body: {},
      },
    );
  typia.assert(contract);
  // 5. Verify end_date is null (open-ended employment)
  TestValidator.equals(
    "end_date is null for open-ended contract",
    contract.end_date,
    null,
  );
  // 6. Verify employee ID matches the created employee
  TestValidator.equals(
    "contract employee matches created employee",
    contract.employee.id,
    employee.id,
  );
  // 7. Verify pay_rate is positive
  TestValidator.predicate("pay_rate is positive", contract.pay_rate > 0);
  // 8. Verify working_hours_per_week is positive
  TestValidator.predicate(
    "working_hours_per_week is positive",
    contract.working_hours_per_week > 0,
  );
}
