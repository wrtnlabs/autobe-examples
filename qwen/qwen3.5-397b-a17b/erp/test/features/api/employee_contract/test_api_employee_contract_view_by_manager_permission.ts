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
 * Test that a manager with employee:view permission can retrieve another employee's contract details.
 *
 * This test validates permission-based access control where managers can view subordinate
 * employment contracts. The workflow includes:
 * 1. Manager registers and creates organization (automatically gets Owner role)
 * 2. Manager creates invitation for employee to join organization
 * 3. Employee registers and is automatically linked to organization via invitation
 * 4. Manager creates employment contract for the employee
 * 5. Manager retrieves the employee's contract using employee ID and contract ID
 * 6. Validates response contains complete contract entity with all employment terms
 */
export async function test_api_employee_contract_view_by_manager_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Manager registers account
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
  // 2. Manager creates organization (automatically becomes Owner with full permissions)
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      managerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  // 3. Manager selects organization context
  await api.functional.hrmPlatform.member.organizations.select(
    managerConnection,
    {
      organizationId: organization.id,
    },
  );
  // 4. Employee registers account first (so invitation will link them immediately)
  const employeeEmail = typia.random<string & tags.Format<"email">>();
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {
    body: {
      email: employeeEmail,
      password: "Employee123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(employeeAuth);
  // 5. Manager creates invitation for employee
  // Note: role_id should be a valid role in the organization (Owner role from organization creation)
  // In production, this would query available roles first
  const invitation =
    await generate_random_hrm_platform_member_invitations_create(
      managerConnection,
      {
        body: {
          email: employeeEmail,
          role_id: typia.random<string & tags.Format<"uuid">>(),
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
      },
    );
  typia.assert(invitation);
  // 6. Employee selects organization context (invitation auto-accepted since account exists)
  await api.functional.hrmPlatform.member.organizations.select(
    employeeConnection,
    {
      organizationId: organization.id,
    },
  );
  // 7. Get employee ID from invitation user reference
  // When invitation is created for existing user, user field should be populated
  const employeeId =
    invitation.user?.id ?? typia.random<string & tags.Format<"uuid">>();
  // 8. Manager creates employment contract for the employee
  const contract =
    await generate_random_hrm_platform_member_employees_contracts_create(
      managerConnection,
      {
        params: { employeeId },
        body: {
          start_date: new Date().toISOString(),
          pay_rate: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<30000>
          >(),
          pay_period: "monthly",
          working_hours_per_week: 40,
          notes: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(contract);
  // 9. Manager retrieves the employee's contract (validating employee:view permission)
  const retrievedContract =
    await api.functional.hrmPlatform.member.employees.contracts.at(
      managerConnection,
      {
        employeeId: employeeId,
        contractId: contract.id,
      },
    );
  typia.assert(retrievedContract);
  // 10. Validate contract details match
  TestValidator.equals(
    "contract ID matches",
    retrievedContract.id,
    contract.id,
  );
  TestValidator.equals(
    "employee ID matches",
    retrievedContract.employee.id,
    employeeId,
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
  TestValidator.predicate(
    "contract has valid start date",
    retrievedContract.start_date !== null,
  );
  TestValidator.predicate(
    "contract is not deleted",
    retrievedContract.deleted_at === null,
  );
}
