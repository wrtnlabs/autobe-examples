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
 * Test idempotent behavior when soft-deleting an already-soft-deleted contract.
 *
 * Validates that calling the contract erase endpoint twice for the same contract succeeds both times. The second call should not throw a 500 or conflict error — demonstrating idempotent behavior per the specification.
 *
 * The flow first sets up the complete organizational context: Admin joins, creates an organization, switches to it, creates a custom role, and invites an employee by email. The employee joins with the invited email, which auto-accepts the invitation and creates the employee record. The employee's ID is obtained from the join response's employees array. Admin then creates a contract for the employee.
 *
 * After setup, the contract is soft-deleted once, then soft-deleted again. Both operations must complete without errors, verifying that the system handles repeat deletion gracefully.
 *
 * 1. Admin joins and authenticates.
 * 2. Admin creates an organization.
 * 3. Admin switches active organization context.
 * 4. Admin creates a custom role.
 * 5. Admin invites an employee email (pending — no account yet).
 * 6. Employee joins with the invited email — invitation auto-accepted, employee record created.
 * 7. Admin creates a contract for the employee.
 * 8. First delete: soft-deletes the contract.
 * 9. Second delete: idempotent soft-delete of the same contract — must succeed.
 */
export async function test_api_contract_soft_delete_idempotent(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin joins the platform
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(adminConnection, {});
  // Step 2: Admin creates an organization
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      adminConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: Admin switches active organization context
  const switched =
    await api.functional.hrmTimeTracking.member.switch_organization.switchOrganization(
      adminConnection,
      {
        organizationId: organization.id,
      },
    );
  typia.assert(switched);
  // Step 4: Admin creates a custom role
  const role =
    await generate_random_hrm_time_tracking_member_organizations_roles_create(
      adminConnection,
      {
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(role);
  // Step 5: Admin invites an employee by email (pending — employee not yet joined)
  const employeeEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const invitation =
    await generate_random_hrm_time_tracking_member_invitations_create(
      adminConnection,
      {
        body: {
          email: employeeEmail,
          role_id: role.id,
        },
      },
    );
  typia.assert(invitation);
  // Step 6: Employee joins with the invited email
  // This auto-accepts the pending invitation and creates the employee record.
  // The join response includes the employees array containing the new employee record.
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuthorized = await authorize_member_join(employeeConnection, {
    body: {
      email: employeeEmail,
    },
  });
  typia.assert(employeeAuthorized);
  const employeeId: string = employeeAuthorized.employees[0].id;
  // Step 7: Admin creates a contract for the employee
  const contract =
    await generate_random_hrm_time_tracking_employees_contracts_create(
      adminConnection,
      {
        params: {
          employeeId,
        },
      },
    );
  typia.assert(contract);
  const contractId: string = contract.id;
  // Step 8: First DELETE — soft-delete the contract
  await api.functional.hrmTimeTracking.employees.contracts.erase(
    adminConnection,
    {
      employeeId,
      contractId,
    },
  );
  // Step 9: Second DELETE — idempotent, must succeed without error
  await api.functional.hrmTimeTracking.employees.contracts.erase(
    adminConnection,
    {
      employeeId,
      contractId,
    },
  );
}
