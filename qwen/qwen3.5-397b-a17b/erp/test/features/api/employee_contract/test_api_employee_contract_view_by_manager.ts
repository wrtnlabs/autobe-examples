import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeContract";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
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
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_employee_contract } from "../../../prepare/prepare_random_hrm_platform_employee_contract";

export async function test_api_employee_contract_view_by_manager(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create manager account with employee:view permission
  const managerConnection: api.IConnection = { host: connection.host };
  const managerAuth = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(managerAuth);
  // 2. Create another member who will be the employee
  const employeeMemberConnection: api.IConnection = { host: connection.host };
  const employeeMemberAuth = await authorize_member_join(
    employeeMemberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmPlatformMember.IJoin,
    },
  );
  typia.assert(employeeMemberAuth);
  // 3. Create employee record for the second member (using manager connection)
  // Note: In a real scenario, we'd need to get a role_id from the organization
  // For this test, we use a generated UUID as placeholder
  const employee = await generate_random_hrm_platform_member_employees_create(
    managerConnection,
    {
      body: {
        member_id: employeeMemberAuth.member.id,
        employment_type: "full-time",
      } satisfies Partial<IHrmPlatformEmployee.ICreate>,
    },
  );
  typia.assert(employee);
  // 4. Create employment contract for the employee
  const contract =
    await generate_random_hrm_platform_member_employees_contracts_create(
      managerConnection,
      {
        params: {
          employeeId: employee.id,
        },
        body: {
          start_date: new Date().toISOString(),
          pay_rate: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          pay_period: RandomGenerator.pick([
            "hourly",
            "daily",
            "weekly",
            "monthly",
          ] as const),
          working_hours_per_week: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<20> & tags.Maximum<60>
          >(),
        } satisfies Partial<IHrmPlatformEmployeeContract.ICreate>,
      },
    );
  typia.assert(contract);
  // 5. Retrieve the contract using manager's authentication context
  const retrievedContract =
    await api.functional.hrmPlatform.member.contracts.at(managerConnection, {
      contractId: contract.id,
    });
  typia.assert(retrievedContract);
  // 6. Validate contract details
  TestValidator.equals(
    "contract id matches",
    retrievedContract.id,
    contract.id,
  );
  TestValidator.equals(
    "employee id matches",
    retrievedContract.employee.id,
    employee.id,
  );
  TestValidator.equals(
    "start date matches",
    retrievedContract.start_date,
    contract.start_date,
  );
  TestValidator.equals(
    "pay rate matches",
    retrievedContract.pay_rate,
    contract.pay_rate,
  );
  TestValidator.equals(
    "pay period matches",
    retrievedContract.pay_period,
    contract.pay_period,
  );
  TestValidator.equals(
    "working hours matches",
    retrievedContract.working_hours_per_week,
    contract.working_hours_per_week,
  );
  TestValidator.predicate(
    "contract has employee info",
    retrievedContract.employee !== undefined,
  );
  TestValidator.equals(
    "employee display name",
    retrievedContract.employee.display_name,
    employee.display_name,
  );
}