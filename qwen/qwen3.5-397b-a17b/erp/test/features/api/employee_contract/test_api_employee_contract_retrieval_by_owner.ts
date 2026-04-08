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
 * Test employee contract retrieval by the contract owner (employee).
 *
 * Validates that an employee can successfully retrieve their own employment contract details through the GET /hrmPlatform/member/employee-contracts/{contractId} endpoint. The test establishes a complete employment context including member registration, organization creation, employee invitation, and contract creation before testing the retrieval operation.
 *
 * The test verifies that the response contains all expected contract fields with correct values, that the employee reference matches the authenticated member, and that the contract is properly marked as active (end_date is null, deleted_at is null).
 *
 * 1. Member registers with email and password via join operation.
 * 2. Member creates an organization to establish employment context.
 * 3. Member creates an employee invitation for themselves to become an employee in the organization.
 * 4. An employment contract is created for the employee with employment terms.
 * 5. Employee retrieves their own contract using the contract ID.
 * 6. Validates all contract fields match the created values and employee reference is correct.
 */
export async function test_api_employee_contract_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  // 3. Create employee invitation for the member (self-invitation)
  // Since member already exists, this will create an employee record directly
  const invitation =
    await generate_random_hrm_platform_member_employee_invitations_create(
      memberConnection,
      {
        body: {
          email: member.email,
          role_id: typia.random<string & tags.Format<"uuid">>(),
          employment_type: "full-time",
          expires_at: new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 30,
          ).toISOString(),
        },
      },
    );
  typia.assert(invitation);
  // 4. Create employment contract for the employee
  const contract =
    await generate_random_hrm_platform_member_employee_contracts_create(
      memberConnection,
      {
        body: {
          hrm_platform_employee_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          start_date: new Date().toISOString(),
          end_date: null,
          pay_rate: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          pay_period: "monthly",
          working_hours_per_week: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<20> & tags.Maximum<60>
          >(),
          notes: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(contract);
  // 5. Retrieve the contract by ID
  const retrievedContract =
    await api.functional.hrmPlatform.member.employee_contracts.at(
      memberConnection,
      {
        contractId: contract.id,
      },
    );
  typia.assert(retrievedContract);
  // 6. Validate contract details
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
    "end date is null (active)",
    retrievedContract.end_date,
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
    "working hours matches",
    retrievedContract.working_hours_per_week,
    contract.working_hours_per_week,
  );
  TestValidator.equals("notes match", retrievedContract.notes, contract.notes);
  TestValidator.predicate(
    "contract is not deleted",
    retrievedContract.deleted_at === null,
  );
  TestValidator.predicate(
    "employee member matches authenticated member",
    retrievedContract.employee.member.id === member.id,
  );
}
