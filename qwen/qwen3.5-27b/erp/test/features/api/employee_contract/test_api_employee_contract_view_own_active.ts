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
 * Test that an authenticated employee can successfully retrieve their own active employment contract.
 *
 * Validates the complete workflow of member registration, employee record creation, active contract creation, and contract retrieval. Ensures that contract details including start_date, pay_rate, pay_period, working_hours_per_week, and notes are returned correctly. The contract should show as active (end_date is null or in the future). The response should include the associated employee summary information. Validates that the contract record is complete and all fields are populated according to the IHrmTimeTrackEmployeeContract schema.
 *
 * 1. Register and authenticate a new member account.
 * 2. Create an employee record linked to the authenticated member.
 * 3. Create an active employment contract for the employee with compensation terms and working hours.
 * 4. Retrieve the contract using the employee ID and contract ID.
 * 5. Validate that all contract fields are correctly populated and the contract is active.
 */
export async function test_api_employee_contract_view_own_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create employee record
  const employee = await generate_random_hrm_time_track_member_employees_create(
    memberConnection,
    {},
  );
  typia.assert(employee);
  // 3. Create active contract for the employee
  const contract =
    await generate_random_hrm_time_track_member_employees_contracts_create(
      memberConnection,
      {
        params: {
          employeeId: employee.id,
        },
        body: {
          end_date: null,
        },
      },
    );
  typia.assert(contract);
  // 4. Retrieve the contract
  const retrievedContract =
    await api.functional.hrmTimeTrack.member.employees.contracts.at(
      memberConnection,
      {
        employeeId: employee.id,
        contractId: contract.id,
      },
    );
  typia.assert(retrievedContract);
  // 5. Validate contract details
  TestValidator.equals(
    "contract id matches",
    retrievedContract.id,
    contract.id,
  );
  TestValidator.equals(
    "employee id matches",
    retrievedContract.employee.id,
    employee.id,
  );
  TestValidator.equals(
    "start_date matches",
    retrievedContract.start_date,
    contract.start_date,
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
  TestValidator.equals(
    "notes matches",
    retrievedContract.notes,
    contract.notes,
  );
  TestValidator.equals(
    "contract is active (end_date is null)",
    retrievedContract.end_date,
    null,
  );
  TestValidator.predicate(
    "employee summary has id",
    retrievedContract.employee.id.length > 0,
  );
  TestValidator.predicate(
    "employee summary has member",
    retrievedContract.employee.member.id.length > 0,
  );
  TestValidator.predicate(
    "created_at exists",
    retrievedContract.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at exists",
    retrievedContract.updated_at.length > 0,
  );
}
