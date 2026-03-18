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

export async function test_api_employee_contract_view_own_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner authentication and setup
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(ownerAuth);
  // Get organization from owner's memberships
  const ownerOrgMembership = ownerAuth.organization_memberships.find(
    (m) => m.organization.owner.id === ownerAuth.id,
  );
  // Ensure owner has at least one organization
  if (!ownerOrgMembership) {
    throw new Error("Owner organization membership not found");
  }
  const organizationId = ownerOrgMembership.organization.id;
  // Create department under organization
  const department =
    await generate_random_hrms_member_organizations_departments_create(
      ownerConnection,
      {
        params: { organizationId },
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(department);
  // 2. Create another member user to act as employee
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(employeeAuth);
  // 3. Create contract for the employee
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  const contractStartDate = new Date();
  contractStartDate.setHours(0, 0, 0, 0);
  const startDateStr = contractStartDate.toISOString();
  const contract = await api.functional.hrms.member.employees.contracts.create(
    ownerConnection,
    {
      employeeId,
      body: {
        start_date: startDateStr,
        pay_rate: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1>
        >(),
        pay_period: RandomGenerator.pick([
          "hourly",
          "daily",
          "weekly",
          "monthly",
        ]),
        working_hours_per_week: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
        notes: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IHrmsEmployeeContract.ICreate,
    },
  );
  typia.assert(contract);
  // Verify contract is active (endDate should be null)
  TestValidator.equals("contract should be active", contract.endDate, null);
  // 4. Employee retrieves their own contract
  const employeeContract =
    await api.functional.hrms.member.employees.contracts.at(
      employeeConnection,
      {
        employeeId: contract.hrmsEmployeeId,
        contractId: contract.id,
      },
    );
  typia.assert(employeeContract);
  // 5. Validate contract details
  TestValidator.equals(
    "employee ID matches",
    employeeContract.hrmsEmployeeId,
    employeeId,
  );
  TestValidator.equals("contract ID matches", employeeContract.id, contract.id);
  TestValidator.equals(
    "start date matches",
    employeeContract.startDate,
    contract.startDate,
  );
  TestValidator.equals(
    "pay rate matches",
    employeeContract.payRate,
    contract.payRate,
  );
  TestValidator.equals(
    "pay period matches",
    employeeContract.payPeriod,
    contract.payPeriod,
  );
  TestValidator.equals(
    "working hours matches",
    employeeContract.workingHoursPerWeek,
    contract.workingHoursPerWeek,
  );
  TestValidator.equals("notes match", employeeContract.notes, contract.notes);
  TestValidator.predicate(
    "employee reference exists",
    () => employeeContract.employee !== undefined,
  );
  TestValidator.equals(
    "contract is still active",
    employeeContract.endDate,
    null,
  );
  TestValidator.predicate(
    "created_at exists",
    () => employeeContract.createdAt !== undefined,
  );
  TestValidator.predicate(
    "updated_at exists",
    () => employeeContract.updatedAt !== undefined,
  );
}
