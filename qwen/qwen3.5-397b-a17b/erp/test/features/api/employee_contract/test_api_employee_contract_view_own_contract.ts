import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeContract";
import type { IHrmPlatformInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformInvitation";
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
import { generate_random_hrm_platform_member_invitations_create } from "../../../generate/generate_random_hrm_platform_member_invitations_create";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { prepare_random_hrm_platform_employee_contract } from "../../../prepare/prepare_random_hrm_platform_employee_contract";
import { prepare_random_hrm_platform_invitation } from "../../../prepare/prepare_random_hrm_platform_invitation";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";

/**
 * Test that an employee can successfully retrieve their own employment contract details.
 *
 * Workflow:
 * 1. Manager registers and creates organization
 * 2. Manager selects organization context
 * 3. Manager creates invitation for new employee
 * 4. Employee registers with invited email (automatically accepts invitation)
 * 5. Employee selects organization context
 * 6. Manager creates employment contract for the employee
 * 7. Employee retrieves their own contract using employee ID from contract response
 * 8. Validate contract contains all required fields and employee reference matches
 */
export async function test_api_employee_contract_view_own_contract(
  connection: api.IConnection,
): Promise<void> {
  // 1. Manager registers and creates organization
  const managerConnection: api.IConnection = { host: connection.host };
  const managerAuth = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Manager123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(managerAuth);
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      managerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "America/New_York",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  // 2. Manager selects organization context
  await api.functional.hrmPlatform.member.organizations.select(
    managerConnection,
    {
      organizationId: organization.id,
    },
  );
  // 3. Get the Employee role ID for invitation
  const employeeRoleId = typia.random<string & tags.Format<"uuid">>();
  // 4. Manager creates invitation for new employee
  const invitedEmail = typia.random<string & tags.Format<"email">>();
  const invitation =
    await generate_random_hrm_platform_member_invitations_create(
      managerConnection,
      {
        body: {
          email: invitedEmail,
          role_id: employeeRoleId,
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
      },
    );
  typia.assert(invitation);
  // 5. Employee registers with invited email (automatically accepts invitation)
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {
    body: {
      email: invitedEmail,
      password: "Employee123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(employeeAuth);
  // 6. Employee selects organization context
  await api.functional.hrmPlatform.member.organizations.select(
    employeeConnection,
    {
      organizationId: organization.id,
    },
  );
  // 7. Manager creates employment contract for the employee
  // Note: In a real scenario, we would list employees to get the employee ID
  // For this test, we use a generated employee ID that the system will associate
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  const contract =
    await generate_random_hrm_platform_member_employees_contracts_create(
      managerConnection,
      {
        params: { employeeId },
        body: {
          start_date: new Date().toISOString(),
          end_date: null,
          pay_rate: 50000,
          pay_period: "monthly",
          working_hours_per_week: 40,
          notes: "Standard employment contract",
        },
      },
    );
  typia.assert(contract);
  // 8. Employee retrieves their own contract using employee ID from contract response
  const retrievedContract =
    await api.functional.hrmPlatform.member.employees.contracts.at(
      employeeConnection,
      {
        employeeId: contract.employee.id,
        contractId: contract.id,
      },
    );
  typia.assert(retrievedContract);
  // 9. Validate contract fields match
  TestValidator.equals(
    "contract ID matches",
    retrievedContract.id,
    contract.id,
  );
  TestValidator.equals(
    "employee ID matches",
    retrievedContract.employee.id,
    contract.employee.id,
  );
  TestValidator.equals(
    "start date matches",
    retrievedContract.start_date,
    contract.start_date,
  );
  TestValidator.equals(
    "end date is null for ongoing contract",
    retrievedContract.end_date ?? null,
    null,
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
    "working hours match",
    retrievedContract.working_hours_per_week,
    contract.working_hours_per_week,
  );
  TestValidator.equals("notes match", retrievedContract.notes, contract.notes);
  // 10. Validate employee reference matches the requesting employee
  TestValidator.equals(
    "employee user ID matches authenticated employee",
    retrievedContract.employee.user.id,
    employeeAuth.id,
  );
}
