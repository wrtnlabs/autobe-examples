import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsDepartment";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployeeContract";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_employees_contracts_create } from "../../../generate/generate_random_hrms_member_employees_contracts_create";
import { generate_random_hrms_member_organizations_departments_create } from "../../../generate/generate_random_hrms_member_organizations_departments_create";
import { prepare_random_hrms_department } from "../../../prepare/prepare_random_hrms_department";
import { prepare_random_hrms_employee_contract } from "../../../prepare/prepare_random_hrms_employee_contract";

export async function test_api_employee_contract_view_manager_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Manager authentication
  const managerConnection: api.IConnection = { host: connection.host };
  const managerAuth = await api.functional.hrms.auth.member.join(
    managerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<
          string & tags.MinLength<8> & tags.Format<"password">
        >(),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmsMember.IJoin,
    },
  );
  typia.assert(managerAuth);
  // 2. Extract organization from manager's memberships
  const firstOrg = managerAuth.organization_memberships[0];
  typia.assert(firstOrg);
  const organizationId = firstOrg.organization.id;
  // 3. Create department within organization
  const department =
    await api.functional.hrms.member.organizations.departments.create(
      managerConnection,
      {
        organizationId,
        body: {
          name: RandomGenerator.alphabets(8),
        } satisfies IHrmsDepartment.ICreate,
      },
    );
  typia.assert(department);
  // 4. Create an employee contract
  // Note: Since employee creation endpoint is not available in SDK,
  // we use a generated UUID for employeeId
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  const startDate = new Date().toISOString();
  const contract = await api.functional.hrms.member.employees.contracts.create(
    managerConnection,
    {
      employeeId,
      body: {
        start_date: startDate,
        pay_rate: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1>
        >(),
        pay_period: RandomGenerator.pick([
          "hourly",
          "daily",
          "weekly",
          "monthly",
        ] as const),
        working_hours_per_week: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<168>
        >(),
      } satisfies IHrmsEmployeeContract.ICreate,
    },
  );
  typia.assert(contract);
  // 5. Retrieve the contract
  const retrievedContract =
    await api.functional.hrms.member.employees.contracts.at(managerConnection, {
      employeeId,
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
    retrievedContract.hrmsEmployeeId,
    employeeId,
  );
  TestValidator.equals(
    "start date matches",
    retrievedContract.startDate,
    contract.startDate,
  );
  TestValidator.equals(
    "end date is null for active contract",
    retrievedContract.endDate,
    null,
  );
  TestValidator.equals(
    "pay rate matches",
    retrievedContract.payRate,
    contract.payRate,
  );
  TestValidator.equals(
    "pay period matches",
    retrievedContract.payPeriod,
    contract.payPeriod,
  );
  TestValidator.equals(
    "working hours per week matches",
    retrievedContract.workingHoursPerWeek,
    contract.workingHoursPerWeek,
  );
  TestValidator.equals(
    "notes matches",
    retrievedContract.notes,
    contract.notes,
  );
  TestValidator.equals(
    "contract belongs to same organization",
    retrievedContract.employee.department_id,
    organizationId,
  );
}
