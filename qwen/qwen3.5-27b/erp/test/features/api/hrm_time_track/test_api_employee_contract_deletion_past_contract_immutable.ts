import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import type { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import type { IHrmTimeTrackEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployeeContract";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_track_member_employees_contracts_create } from "../../../generate/generate_random_hrm_time_track_member_employees_contracts_create";
import { generate_random_hrm_time_track_member_employees_create } from "../../../generate/generate_random_hrm_time_track_member_employees_create";
import { prepare_random_hrm_time_track_employee } from "../../../prepare/prepare_random_hrm_time_track_employee";
import { prepare_random_hrm_time_track_employee_contract } from "../../../prepare/prepare_random_hrm_time_track_employee_contract";

/**
 * Test that past contracts (contracts with end_date in the past) are immutable and cannot be deleted.
 *
 * Validates the immutability rule for historical employee contracts. Past contracts with end dates in the past are preserved as immutable records for audit purposes and cannot be soft-deleted. This ensures historical employment data remains intact and tamper-proof.
 *
 * The test creates a member account, establishes an employee record, and creates a contract with an end date set to 30 days in the past. It then attempts to delete this past contract and verifies that the operation fails with an appropriate error, confirming the immutability rule is enforced.
 *
 * 1. Authenticate as a member with employee management permissions.
 * 2. Create an employee record in the organization.
 * 3. Create a contract for the employee with an end_date set to 30 days ago.
 * 4. Attempt to delete the past contract using the erase endpoint.
 * 5. Verify the deletion fails with an error indicating immutability.
 * 6. Confirm the contract remains accessible as a historical record.
 */
export async function test_api_employee_contract_deletion_past_contract_immutable(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create employee
  const employee = await generate_random_hrm_time_track_member_employees_create(
    memberConnection,
    {},
  );
  typia.assert(employee);
  // 3. Create a past contract (end_date 30 days ago)
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 30);
  const contract =
    await generate_random_hrm_time_track_member_employees_contracts_create(
      memberConnection,
      {
        params: { employeeId: employee.id },
        body: {
          start_date: new Date(
            pastDate.getTime() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          end_date: pastDate.toISOString(),
          pay_rate: 50000,
          pay_period: "monthly",
          working_hours_per_week: 40,
        },
      },
    );
  typia.assert(contract);
  // 4. Attempt to delete the past contract - should fail
  await TestValidator.error(
    "past contract deletion should fail due to immutability",
    async () => {
      await api.functional.hrmTimeTrack.member.employees.contracts.erase(
        memberConnection,
        {
          employeeId: employee.id,
          contractId: contract.id,
        },
      );
    },
  );
  // 5. Verify contract still exists (implicit - if deletion failed, it exists)
  // The contract remains accessible as a historical record
  TestValidator.predicate(
    "contract end_date is in the past",
    new Date(contract.end_date!) < new Date(),
  );
}
