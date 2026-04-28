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
 * Test employment contract creation with all optional fields including end_date and notes.
 *
 * Validates creating a fixed-term employment contract with complete compensation terms and qualitative notes. The contract includes end_date to represent a defined-term employment agreement and notes documenting special conditions or agreed-upon terms.
 *
 * Tests that optional contract fields are properly persisted and returned, ensuring the system supports both open-ended contracts (null end_date) and fixed-term contracts (specified end_date).
 *
 * 1. Member registers and authenticates to the platform.
 * 2. Custom role with employee:manage permission is created.
 * 3. Employee record is created with the custom role assignment.
 * 4. Employment contract is created with all required fields plus optional end_date and notes.
 * 5. Contract end_date matches the provided fixed-term date.
 * 6. Contract notes match the provided qualitative text.
 * 7. Contract pay_rate is positive, pay_period is valid, and working_hours_per_week is positive.
 */
export async function test_api_employee_contract_creation_with_optional_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {},
  });
  // 2. Create custom role with employee:manage permission
  const role = await generate_random_hrm_platform_member_roles_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        permissionKeys: ["employee:manage"],
      },
    },
  );
  typia.assert(role);
  // 3. Create employee with the custom role
  const employee = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    {
      body: {
        roleId: role.id,
      },
    },
  );
  typia.assert(employee);
  // 4. Create contract with all optional fields
  const startDate = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 7 days ago
  const endDate = new Date(
    Date.now() + 365 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 1 year from now
  const notes = RandomGenerator.paragraph({ sentences: 3 });
  const payRate = 50000;
  const payPeriod: "hourly" | "daily" | "weekly" | "monthly" = "monthly";
  const workingHoursPerWeek: number & tags.Type<"int32"> = 40;
  const body = {
    start_date: startDate,
    end_date: endDate,
    pay_rate: payRate,
    pay_period: payPeriod,
    working_hours_per_week: workingHoursPerWeek,
    notes: notes,
  } satisfies IHrmPlatformEmployeeContract.ICreate;
  const contract =
    await api.functional.hrmPlatform.member.employees.contracts.create(
      memberConnection,
      {
        employeeId: employee.id,
        body,
      },
    );
  typia.assert(contract);
  // 5. Validate end_date matches provided fixed-term date
  TestValidator.equals("contract end_date matches", contract.end_date, endDate);
  // 6. Validate notes match provided qualitative text
  TestValidator.equals("contract notes match", contract.notes, notes);
  // 7. Validate contract business logic
  TestValidator.predicate("pay_rate is positive", contract.pay_rate > 0);
  TestValidator.predicate(
    "working_hours_per_week is positive",
    contract.working_hours_per_week > 0,
  );
  TestValidator.predicate(
    "start_date is before end_date",
    contract.start_date < contract.end_date!,
  );
}
