import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployeeContract";
import type { IHrmTimeTrackingInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingInvitation";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_employees_contracts_create } from "../../../generate/generate_random_hrm_time_tracking_employees_contracts_create";
import { generate_random_hrm_time_tracking_member_invitations_create } from "../../../generate/generate_random_hrm_time_tracking_member_invitations_create";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { generate_random_hrm_time_tracking_member_organizations_roles_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_roles_create";
import { prepare_random_hrm_time_tracking_employee_contract } from "../../../prepare/prepare_random_hrm_time_tracking_employee_contract";
import { prepare_random_hrm_time_tracking_invitation } from "../../../prepare/prepare_random_hrm_time_tracking_invitation";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_role } from "../../../prepare/prepare_random_hrm_time_tracking_role";

/**
 * Test setting an end_date on an active employee contract transitions it to a past immutable contract.
 *
 * Validates the complete workflow of ending an active contract by setting its end_date via the PUT update endpoint. After the end_date is set, the contract becomes a past (immutable) contract and subsequent modification attempts are rejected with an HTTP 422 error.
 *
 * The test creates a realistic organizational setup with an owner, a custom role with employee:manage permission, an invited employee, and an active contract. The end_date operation is verified by checking the response fields, and immutability is verified by attempting a second update that should fail.
 *
 * 1. Owner registers, creates an organization with custom role (employee:manage).
 * 2. Employee registers separately, then is invited to the organization (auto-creates active employee record).
 * 3. Employee re-authenticates to obtain the employee ID from their organization membership.
 * 4. Owner creates an active contract (no end_date) for the employee.
 * 5. Owner sets end_date on the contract via PUT update — contract transitions to past/immutable.
 * 6. Owner attempts to modify the now-past contract — expects HTTP 422 error indicating immutability.
 */
export async function test_api_contract_end_date_set_transitions_to_past(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register owner member and create organization
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerPassword = RandomGenerator.alphaNumeric(16);
  const ownerJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: ownerPassword,
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IHrmTimeTrackingMember.IJoin;
  const owner = await authorize_member_join(ownerConnection, {
    body: ownerJoinInput,
  });
  typia.assert(owner);
  // 2. Create organization
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      ownerConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create custom role with employee:manage permission
  const role =
    await generate_random_hrm_time_tracking_member_organizations_roles_create(
      ownerConnection,
      {
        params: { organizationId: organization.id },
        body: {
          name: `em-${RandomGenerator.alphabets(8)}`,
          permissions: ["employee:manage"],
        },
      },
    );
  typia.assert(role);
  // 4. Register employee member (separate connection)
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeePassword = RandomGenerator.alphaNumeric(16);
  const employeeEmail = typia.random<string & tags.Format<"email">>();
  const employeeJoinInput = {
    email: employeeEmail,
    password: employeePassword,
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IHrmTimeTrackingMember.IJoin;
  const employeeJoin = await authorize_member_join(employeeConnection, {
    body: employeeJoinInput,
  });
  typia.assert(employeeJoin);
  // 5. Invite employee to organization (auto-creates active employee record since email exists)
  const invitation =
    await generate_random_hrm_time_tracking_member_invitations_create(
      ownerConnection,
      {
        body: {
          email: employeeEmail,
          role_id: role.id,
        },
      },
    );
  typia.assert(invitation);
  // 6. Re-login employee to get updated employees array with the new employee ID
  const refreshedEmployee = await authorize_member_login(employeeConnection, {
    body: {
      email: employeeEmail,
      password: employeePassword,
      href: ownerJoinInput.href,
      referrer: ownerJoinInput.referrer,
    },
  });
  typia.assert(refreshedEmployee);
  const employeeId = refreshedEmployee.employees[0].id;
  // 7. Create active contract (no end_date)
  const contract =
    await generate_random_hrm_time_tracking_employees_contracts_create(
      ownerConnection,
      {
        params: { employeeId },
        body: {
          startDate: "2026-01-01T00:00:00.000Z",
          payRate: 5000,
          payPeriod: "monthly",
          workingHoursPerWeek: 40,
          endDate: undefined,
        },
      },
    );
  typia.assert(contract);
  TestValidator.equals("end_date is null initially", contract.end_date, null);
  // 8. Set end_date on the active contract via PUT update
  const updatedContract =
    await api.functional.hrmTimeTracking.employees.contracts.update(
      ownerConnection,
      {
        employeeId,
        contractId: contract.id,
        body: {
          end_date: "2026-04-01T00:00:00.000Z",
        } satisfies IHrmTimeTrackingEmployeeContract.IUpdate,
      },
    );
  typia.assert(updatedContract);
  // 9. Verify end_date and updated_at
  TestValidator.equals(
    "end_date set to 2026-04-01",
    updatedContract.end_date,
    "2026-04-01T00:00:00.000Z",
  );
  TestValidator.predicate(
    "updated_at changed",
    () => updatedContract.updated_at > contract.updated_at,
  );
  // 10. Attempt to update the now-past contract — should fail with 422
  await TestValidator.httpError("past contract is immutable", 422, async () => {
    await api.functional.hrmTimeTracking.employees.contracts.update(
      ownerConnection,
      {
        employeeId,
        contractId: contract.id,
        body: {
          pay_rate: 6000,
        } satisfies IHrmTimeTrackingEmployeeContract.IUpdate,
      },
    );
  });
}