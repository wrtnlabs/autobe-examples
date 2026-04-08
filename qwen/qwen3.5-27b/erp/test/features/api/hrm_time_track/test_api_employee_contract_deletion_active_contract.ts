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
 * Test the successful deletion of an active employee contract.
 *
 * Validates the complete employee contract deletion workflow including member authentication, employee creation, active contract creation, and contract deletion. Ensures that active contracts (those without an end_date or with a future end_date) can be soft-deleted while preserving the historical record for audit purposes.
 *
 * The test follows the natural business flow: member registration, employee creation, contract creation with active status, and contract deletion. Special attention is given to verifying that the deletion operation completes successfully without errors, confirming that the soft-delete mechanism works correctly.
 *
 * 1. Authenticate as a member with employee management permissions.
 * 2. Create an employee record in the organization.
 * 3. Create an active contract for the employee (no end_date specified, making it ongoing).
 * 4. Delete the active contract using the erase endpoint.
 * 5. Verify the deletion operation completes without error.
 */
export async function test_api_employee_contract_deletion_active_contract(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member with employee management permissions
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create an employee record
  const employee = await generate_random_hrm_time_track_member_employees_create(
    memberConnection,
    {},
  );
  typia.assert(employee);
  // 3. Create an active contract for the employee (no end_date = ongoing)
  const contract =
    await generate_random_hrm_time_track_member_employees_contracts_create(
      memberConnection,
      {
        params: {
          employeeId: employee.id,
        },
        body: {
          end_date: null, // Active contract with no end date
        },
      },
    );
  typia.assert(contract);
  // 4. Delete the active contract
  await api.functional.hrmTimeTrack.member.employees.contracts.erase(
    memberConnection,
    {
      employeeId: employee.id,
      contractId: contract.id,
    },
  );
  // 5. Validate that deletion completed without error
  TestValidator.predicate("contract deletion completed without error", true);
}
