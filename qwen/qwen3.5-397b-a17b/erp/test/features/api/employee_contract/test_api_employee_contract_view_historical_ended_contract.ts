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
 * Test employee contract historical ended contract retrieval.
 *
 * This test validates the contract lifecycle management where:
 * 1. Manager creates organization and invites employee
 * 2. Employee accepts invitation and becomes employee record
 * 3. Manager creates first employment contract
 * 4. Manager creates second contract which automatically ends the first contract
 * 5. Employee can retrieve the historical ended contract with preserved terms
 *
 * This ensures contract history remains immutable and accessible for audit purposes.
 */
export async function test_api_employee_contract_view_historical_ended_contract(
  connection: api.IConnection,
): Promise<void> {
  // 1. Manager registers and creates organization
  const managerConnection: api.IConnection = { host: connection.host };
  const managerAuth = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
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
          name: RandomGenerator.paragraph({ sentences: 1 }),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 2. Select organization context
  await api.functional.hrmPlatform.member.organizations.select(
    managerConnection,
    {
      organizationId: organization.id,
    },
  );
  // 3. Employee registers account first (so invitation auto-creates employee record)
  const employeeEmail = typia.random<string & tags.Format<"email">>();
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {
    body: {
      email: employeeEmail,
      password: "Test1234!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(employeeAuth);
  // 4. Manager creates invitation for employee
  // Since user already exists, this auto-creates the employee record
  // We use a generated UUID for role_id - system has built-in roles
  const roleId = typia.random<string & tags.Format<"uuid">>();
  const invitation =
    await generate_random_hrm_platform_member_invitations_create(
      managerConnection,
      {
        body: {
          email: employeeEmail,
          role_id: roleId,
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies IHrmPlatformInvitation.ICreate,
      },
    );
  typia.assert(invitation);
  // 5. Get employee ID from invitation's user field
  // When user exists, invitation.user is populated with the member info
  // The employee record is created with the same user_id
  // We need to get the employee ID - since we can't list employees,
  // we'll create a contract and get the employee info from the response
  // Actually, the invitation response has user (member), not employee
  // We need employee.id for contract creation
  // Since we can't list employees, we'll need to work with what we have
  // The contract creation will return the employee info in the response
  // We can use the employeeAuth.id as a reference, but we need employee record ID
  // Alternative approach: Create contract with a placeholder and extract employee ID
  // But we need employeeId as path parameter...
  // Let's use the member ID as employee ID reference
  // In many systems, employee record ID might be same as or linked to user ID
  // We'll try using employeeAuth.id as the employeeId
  const employeeId = employeeAuth.id;
  // 6. Manager creates first contract
  const firstContractStartDate = new Date();
  const firstContract =
    await generate_random_hrm_platform_member_employees_contracts_create(
      managerConnection,
      {
        params: { employeeId: employeeId },
        body: {
          start_date: firstContractStartDate.toISOString(),
          pay_rate: 50000,
          pay_period: "monthly",
          working_hours_per_week: 40,
          notes: "Initial employment contract",
        } satisfies IHrmPlatformEmployeeContract.ICreate,
      },
    );
  typia.assert(firstContract);
  // Extract actual employee ID from contract response
  const actualEmployeeId = firstContract.employee.id;
  // 7. Manager creates second contract (ends the first contract)
  const secondContractStartDate = new Date(firstContractStartDate);
  secondContractStartDate.setDate(secondContractStartDate.getDate() + 90);
  const secondContract =
    await generate_random_hrm_platform_member_employees_contracts_create(
      managerConnection,
      {
        params: { employeeId: actualEmployeeId },
        body: {
          start_date: secondContractStartDate.toISOString(),
          pay_rate: 55000,
          pay_period: "monthly",
          working_hours_per_week: 40,
          notes: "Contract renewal with salary increase",
        } satisfies IHrmPlatformEmployeeContract.ICreate,
      },
    );
  typia.assert(secondContract);
  // 8. Retrieve historical ended contract using employee connection
  const historicalContract =
    await api.functional.hrmPlatform.member.employees.contracts.at(
      employeeConnection,
      {
        employeeId: actualEmployeeId,
        contractId: firstContract.id,
      },
    );
  typia.assert(historicalContract);
  // 9. Validate historical contract has end_date populated
  TestValidator.notEquals(
    "Historical contract should have end_date",
    historicalContract.end_date,
    null,
  );
  TestValidator.notEquals(
    "Historical contract should have end_date",
    historicalContract.end_date,
    undefined,
  );
  // 10. Validate contract terms are preserved
  TestValidator.equals(
    "Contract pay_rate preserved",
    historicalContract.pay_rate,
    firstContract.pay_rate,
  );
  TestValidator.equals(
    "Contract pay_period preserved",
    historicalContract.pay_period,
    firstContract.pay_period,
  );
  TestValidator.equals(
    "Contract working_hours preserved",
    historicalContract.working_hours_per_week,
    firstContract.working_hours_per_week,
  );
  // 11. Validate end_date is before second contract start_date
  if (historicalContract.end_date) {
    const endDate = new Date(historicalContract.end_date);
    const secondStartDate = new Date(secondContract.start_date);
    TestValidator.predicate(
      "Historical contract end_date should be before second contract start",
      endDate < secondStartDate,
    );
  }
  // 12. Verify ongoing contract has null end_date
  const ongoingContract =
    await api.functional.hrmPlatform.member.employees.contracts.at(
      employeeConnection,
      {
        employeeId: actualEmployeeId,
        contractId: secondContract.id,
      },
    );
  typia.assert(ongoingContract);
  TestValidator.equals(
    "Ongoing contract should have null end_date",
    ongoingContract.end_date,
    null,
  );
}
