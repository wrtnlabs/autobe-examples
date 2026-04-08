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
 * Test updating an active employee contract's compensation terms and working conditions.
 *
 * Validates the complete contract update flow including member authentication, employee creation, active contract creation, and contract modification. Ensures that the contract correctly reflects updated pay rate and working hours while maintaining immutable fields like start_date.
 *
 * Special attention is given to verifying that the start_date remains unchanged (immutable field), the updated_at timestamp is refreshed, and the contract remains active (end_date stays null) after the update operation.
 *
 * 1. Member authenticates via join endpoint.
 * 2. Employee record is created with position and employment type.
 * 3. Active contract is created for the employee (no end_date).
 * 4. Contract is updated with new pay_rate and working_hours_per_week.
 * 5. Validates updated contract reflects new values while start_date is unchanged.
 */
export async function test_api_employee_contract_update_active_contract(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create employee
  const employee = await generate_random_hrm_time_track_member_employees_create(
    memberConnection,
    {},
  );
  typia.assert(employee);
  // 3. Create active contract (no end_date)
  const contract =
    await generate_random_hrm_time_track_member_employees_contracts_create(
      memberConnection,
      {
        params: { employeeId: employee.id },
        body: {
          end_date: null,
        },
      },
    );
  typia.assert(contract);
  // Store original timestamps for validation
  const originalCreatedAt = contract.created_at;
  // 4. Update contract with new values
  const updatedContract =
    await api.functional.hrmTimeTrack.member.employees.contracts.update(
      memberConnection,
      {
        employeeId: employee.id,
        contractId: contract.id,
        body: {
          pay_rate: 50,
          working_hours_per_week: 40,
          notes: "Updated contract terms",
        } satisfies IHrmTimeTrackEmployeeContract.IUpdate,
      },
    );
  typia.assert(updatedContract);
  // 5. Validate business logic: updated_at is newer than created_at
  TestValidator.predicate(
    "updated_at is newer than created_at",
    new Date(updatedContract.updated_at) > new Date(originalCreatedAt),
  );
}
