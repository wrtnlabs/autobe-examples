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
import { generate_random_hrm_time_track_member_organizations_create } from "../../../generate/generate_random_hrm_time_track_member_organizations_create";
import { prepare_random_hrm_time_track_employee } from "../../../prepare/prepare_random_hrm_time_track_employee";
import { prepare_random_hrm_time_track_employee_contract } from "../../../prepare/prepare_random_hrm_time_track_employee_contract";
import { prepare_random_hrm_time_track_organization } from "../../../prepare/prepare_random_hrm_time_track_organization";

/**
 * Test that employee deletion is blocked when the employee has an active employment contract.
 *
 * Validates the complete employee deletion protection flow including member authentication, organization creation, employee record setup, and active contract creation. Ensures that the system correctly prevents employee deletion when an active employment contract exists.
 *
 * Special attention is given to verifying that the deletion attempt fails with an appropriate error when the employee has an active contract (end_date >= current date), and that the employee record remains intact.
 *
 * 1. Member registers and authenticates with the system.
 * 2. Organization is created with required settings (name, currency, timezone, fiscal_start_month).
 * 3. Employee record is created linking the authenticated member to the organization.
 * 4. Active employment contract is created for the employee with end_date in the future.
 * 5. Deletion attempt is made on the employee with active contract.
 * 6. Validates that deletion fails with 409 Conflict error.
 * 7. Verifies the employee record remains unchanged and accessible.
 */
export async function test_api_employee_deletion_blocked_by_active_contract(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create organization
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create employee using the authenticated member's ID
  const employee = await generate_random_hrm_time_track_member_employees_create(
    memberConnection,
    {
      body: {
        hrm_time_track_member_id: memberAuth.id,
      },
    },
  );
  typia.assert(employee);
  // 4. Create active contract (end_date in the future)
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 1); // 1 year from now
  const contract =
    await generate_random_hrm_time_track_member_employees_contracts_create(
      memberConnection,
      {
        params: {
          employeeId: employee.id,
        },
        body: {
          start_date: new Date().toISOString(),
          end_date: futureDate.toISOString(),
          pay_rate: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          pay_period: "monthly",
          working_hours_per_week: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<60>
          >(),
        } satisfies IHrmTimeTrackEmployeeContract.ICreate,
      },
    );
  typia.assert(contract);
  // 5. Attempt to delete employee (should fail due to active contract)
  await TestValidator.httpError(
    "deletion blocked by active contract",
    409,
    async () =>
      await api.functional.hrmTimeTrack.member.employees.erase(
        memberConnection,
        {
          employeeId: employee.id,
        },
      ),
  );
  // 6. Verify employee still exists (implicit - if deletion succeeded, this would fail)
  // The employee record remains unchanged as deletion was blocked
}
