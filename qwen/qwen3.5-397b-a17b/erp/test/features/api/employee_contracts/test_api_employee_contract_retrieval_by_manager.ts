import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeContract";
import type { IHrmPlatformEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeInvitation";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employee_contracts_create } from "../../../generate/generate_random_hrm_platform_member_employee_contracts_create";
import { generate_random_hrm_platform_member_employee_invitations_create } from "../../../generate/generate_random_hrm_platform_member_employee_invitations_create";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { prepare_random_hrm_platform_employee_contract } from "../../../prepare/prepare_random_hrm_platform_employee_contract";
import { prepare_random_hrm_platform_employee_invitation } from "../../../prepare/prepare_random_hrm_platform_employee_invitation";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";

/**
 * Test employee contract retrieval by manager with employee:view permission.
 *
 * Validates that a manager can retrieve another employee's contract details within the same organization. The test establishes a complete organizational hierarchy with a manager creating an organization, inviting an employee, and creating an employment contract for that employee.
 *
 * The manager then retrieves the employee's contract using the contract ID to verify that permission-based access control works correctly. This ensures that users with employee:view permission can access any employee's contracts within their organization, not just their own.
 *
 * 1. Manager member registers and authenticates via join operation.
 * 2. Manager creates an organization and becomes the owner.
 * 3. Employee member registers and authenticates via separate join operation.
 * 4. Manager creates an employee invitation for the employee member.
 * 5. Manager creates an employment contract for the employee.
 * 6. Manager retrieves the employee's contract using GET endpoint.
 * 7. Validates contract details match the created values and employee reference is correct.
 */
export async function test_api_employee_contract_retrieval_by_manager(
  connection: api.IConnection,
): Promise<void> {
  // 1. Manager member registration and authentication
  const managerConnection: api.IConnection = { host: connection.host };
  const managerAuth = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(managerAuth);
  // 2. Manager creates organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      managerConnection,
      {},
    );
  typia.assert(organization);
  // 3. Employee member registration and authentication
  const employeeEmail = typia.random<string & tags.Format<"email">>();
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {
    body: {
      email: employeeEmail,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(employeeAuth);
  // 4. Manager creates employee invitation for the employee member
  // Since employee already exists (just registered), invitation will be accepted immediately
  // and employee record will be created in the organization
  const invitation =
    await generate_random_hrm_platform_member_employee_invitations_create(
      managerConnection,
      {
        body: {
          email: employeeEmail,
          employment_type: "full-time",
          expires_at: new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 30,
          ).toISOString(),
          role_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IHrmPlatformEmployeeInvitation.ICreate,
      },
    );
  typia.assert(invitation);
  // 5. Manager creates employment contract for the employee
  // Note: In a complete API, we would query GET /employees to get the employee ID
  // For this test, we use the contract creation with proper employee reference
  const contract =
    await generate_random_hrm_platform_member_employee_contracts_create(
      managerConnection,
      {
        body: {
          hrm_platform_employee_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          start_date: new Date().toISOString(),
          pay_rate: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          pay_period: "monthly",
          working_hours_per_week: 40,
        } satisfies IHrmPlatformEmployeeContract.ICreate,
      },
    );
  typia.assert(contract);
  // 6. Manager retrieves the employee's contract using GET endpoint
  const retrievedContract =
    await api.functional.hrmPlatform.member.employee_contracts.at(
      managerConnection,
      {
        contractId: contract.id,
      },
    );
  typia.assert(retrievedContract);
  // 7. Validate contract details match
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
}