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
 * Test that attempting to update a past (ended) employee contract is rejected.
 *
 * Validates that employee contracts with end dates in the past cannot be modified, ensuring audit trail integrity for employment history. The test creates a contract with a past end date and verifies that update attempts are rejected with appropriate error responses.
 *
 * The business rule enforces that past contracts are immutable historical records. This ensures that employment compensation history cannot be altered after the contract period has ended, maintaining data integrity for payroll, reporting, and compliance purposes.
 *
 * 1. Authenticate as a member with employee management permissions.
 * 2. Create an employee record in the organization.
 * 3. Create a contract for the employee with an end_date set in the past (30 days ago).
 * 4. Attempt to update the past contract by modifying pay_rate and working_hours_per_week.
 * 5. Verify the update request is rejected with an HTTP error (400 or 422).
 */
export async function test_api_employee_contract_update_past_contract_rejected(
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
  // 3. Create contract with past end_date (30 days ago)
  const pastDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const contract =
    await generate_random_hrm_time_track_member_employees_contracts_create(
      memberConnection,
      {
        params: { employeeId: employee.id },
        body: {
          start_date: pastDate.toISOString(),
          end_date: pastDate.toISOString(),
          pay_rate: 50000,
          pay_period: "monthly",
          working_hours_per_week: 40,
        },
      },
    );
  typia.assert(contract);
  // 4. Attempt to update the past contract
  // This should be rejected because the contract has ended (end_date is in the past)
  await TestValidator.httpError(
    "past contract update rejected",
    [400, 422],
    async () => {
      await api.functional.hrmTimeTrack.member.employees.contracts.update(
        memberConnection,
        {
          employeeId: employee.id,
          contractId: contract.id,
          body: {
            pay_rate: 75000,
            working_hours_per_week: 35,
          } satisfies IHrmTimeTrackEmployeeContract.IUpdate,
        },
      );
    },
  );
}
