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
 * Test historical employee contract retrieval with populated end_date.
 *
 * Validates that completed employment contracts with both start_date and end_date can be successfully retrieved by the employee. This test ensures that historical contract records are preserved and accessible for audit purposes even after the employment period has concluded.
 *
 * The test creates a complete employment workflow: member registration, organization creation, employee invitation/acceptance, and historical contract creation. The historical contract is distinguished by having a populated end_date field, indicating the contract period has ended.
 *
 * 1. Member registers with unique email and password credentials.
 * 2. Member creates an organization with required configuration (currency, timezone, fiscal start month).
 * 3. Member creates employee invitation to add themselves as employee in the organization.
 * 4. Historical employment contract is created with start_date in the past and end_date populated.
 * 5. Employee retrieves the historical contract using GET /hrmPlatform/member/employee-contracts/{contractId}.
 * 6. Validates end_date is not null, start_date is before end_date, and all contract fields are present.
 */
export async function test_api_employee_contract_historical_retrieval(
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
      {},
    );
  typia.assert(organization);
  // 3. Create employee invitation (member adds themselves as employee)
  // Since the member already exists, this will return an employee record
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
        } satisfies IHrmPlatformEmployeeInvitation.ICreate,
      },
    );
  typia.assert(invitation);
  // Extract employee ID from the response
  // When email exists, response contains employee data; otherwise invitation data
  const employeeId = (invitation as any).id satisfies string &
    tags.Format<"uuid">;
  // 4. Create historical contract with end_date populated
  const pastStartDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 365);
  const pastEndDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 180);
  const contract =
    await api.functional.hrmPlatform.member.employee_contracts.create(
      memberConnection,
      {
        body: {
          hrm_platform_employee_id: employeeId,
          start_date: pastStartDate.toISOString(),
          end_date: pastEndDate.toISOString(),
          pay_rate: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          pay_period: "monthly",
          working_hours_per_week: 40,
          notes: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IHrmPlatformEmployeeContract.ICreate,
      },
    );
  typia.assert(contract);
  // 5. Retrieve the historical contract
  const retrievedContract =
    await api.functional.hrmPlatform.member.employee_contracts.at(
      memberConnection,
      {
        contractId: contract.id,
      },
    );
  typia.assert(retrievedContract);
  // 6. Validate historical contract properties
  TestValidator.equals(
    "contract ID matches",
    retrievedContract.id,
    contract.id,
  );
  TestValidator.predicate(
    "end_date is populated (historical contract)",
    retrievedContract.end_date !== null,
  );
  TestValidator.predicate(
    "end_date is valid datetime",
    retrievedContract.end_date !== null &&
      !isNaN(Date.parse(retrievedContract.end_date)),
  );
  TestValidator.predicate(
    "start_date is before end_date",
    new Date(contract.start_date) < new Date(contract.end_date!),
  );
  TestValidator.equals(
    "pay_rate matches",
    retrievedContract.pay_rate,
    contract.pay_rate,
  );
  TestValidator.equals(
    "pay_period matches",
    retrievedContract.pay_period,
    contract.pay_period,
  );
  TestValidator.equals(
    "working_hours_per_week matches",
    retrievedContract.working_hours_per_week,
    contract.working_hours_per_week,
  );
  TestValidator.predicate(
    "employee reference exists",
    retrievedContract.employee !== undefined,
  );
  TestValidator.predicate(
    "created_at timestamp exists",
    retrievedContract.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    retrievedContract.updated_at !== undefined,
  );
}
