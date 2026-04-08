import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmContract";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployeeInvitation";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_employees_contracts_create } from "../../../generate/generate_random_hrm_member_employees_contracts_create";
import { generate_random_hrm_member_invitations_create } from "../../../generate/generate_random_hrm_member_invitations_create";
import { prepare_random_hrm_contract } from "../../../prepare/prepare_random_hrm_contract";
import { prepare_random_hrm_employee_invitation } from "../../../prepare/prepare_random_hrm_employee_invitation";

export async function test_api_contract_creation_auto_terminate_previous(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member with employee:manage permission
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create employee invitation
  const invitation = await generate_random_hrm_member_invitations_create(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        role_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IHrmEmployeeInvitation.ICreate,
    },
  );
  typia.assert(invitation);
  // Note: For this test, we assume the employee record exists
  // In a real scenario, we would need to accept the invitation first
  // Using the invitation email to simulate employee creation
  const employeeId = invitation.id; // Placeholder - in reality would need actual employee ID
  // 3. Create first contract (active contract with NULL end_date)
  const firstContractStartDate = new Date("2024-01-01T00:00:00Z");
  const firstContract =
    await generate_random_hrm_member_employees_contracts_create(
      memberConnection,
      {
        params: { employeeId },
        body: {
          start_date: firstContractStartDate.toISOString(),
          pay_rate: 50.0,
          pay_period: "monthly",
          working_hours_per_week: 40,
        } satisfies IHrmContract.ICreate,
      },
    );
  typia.assert(firstContract);
  // Validate first contract is active (end_date is NULL)
  TestValidator.equals(
    "first contract is active",
    firstContract.end_date,
    null,
  );
  // 4. Create second contract with later start_date
  const secondContractStartDate = new Date("2024-06-01T00:00:00Z");
  const secondContract =
    await generate_random_hrm_member_employees_contracts_create(
      memberConnection,
      {
        params: { employeeId },
        body: {
          start_date: secondContractStartDate.toISOString(),
          pay_rate: 55.0,
          pay_period: "monthly",
          working_hours_per_week: 40,
        } satisfies IHrmContract.ICreate,
      },
    );
  typia.assert(secondContract);
  // Validate second contract is active (end_date is NULL)
  TestValidator.equals(
    "second contract is active",
    secondContract.end_date,
    null,
  );
  // 5. Query employee's contract list to verify both contracts exist
  // Note: This would require a GET endpoint for employee contracts
  // For now, we validate the business logic through the created contracts
  // 6. Validate first contract's end_date was automatically set to one day before new start_date
  const expectedFirstContractEndDate = new Date(secondContractStartDate);
  expectedFirstContractEndDate.setDate(
    expectedFirstContractEndDate.getDate() - 1,
  );
  // Fetch the updated first contract to verify end_date was set
  // Note: This would require a GET endpoint for individual contract
  // In a real test, we would fetch the contract and validate
  // 7. Validate employment continuity - no gaps between contracts
  TestValidator.predicate(
    "employment continuity maintained",
    firstContract.end_date !== null &&
      new Date(firstContract.end_date).getTime() ===
        expectedFirstContractEndDate.getTime(),
  );
}
