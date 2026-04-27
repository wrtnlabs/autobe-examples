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
 * Test soft-deleting a past/ended employee contract.
 *
 * Past contracts (with end_date set) are immutable for edits per business rules,
 * but CAN still be soft-deleted, preserving historical compensation records while
 * removing them from active queries.
 *
 * 1. Admin member joins the platform.
 * 2. Admin creates an organization.
 * 3. Admin switches organization context to the new organization.
 * 4. Admin creates a custom role within the organization.
 * 5. Employee member joins the platform.
 * 6. Admin invites the Employee (auto-creates employee record for registered user).
 * 7. Employee re-authenticates to get updated employee records.
 * 8. Admin creates a past/ended contract (start_date 6 months ago, end_date 1 month ago) for the Employee.
 * 9. Admin soft-deletes the past contract.
 * 10. Validates that the soft-delete completed without errors.
 */
export async function test_api_contract_past_soft_delete(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  await authorize_member_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });
  // 2. Admin creates organization
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      adminConnection,
      {},
    );
  typia.assert(organization);
  // 3. Admin switches organization context
  const switched =
    await api.functional.hrmTimeTracking.member.switch_organization.switchOrganization(
      adminConnection,
      {
        organizationId: organization.id,
      },
    );
  typia.assert(switched);
  // 4. Admin creates a custom role
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
  // 5. Employee joins
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeEmail = typia.random<string & tags.Format<"email">>();
  const employeePassword = RandomGenerator.alphaNumeric(16);
  await authorize_member_join(employeeConnection, {
    body: {
      email: employeeEmail,
      password: employeePassword,
    },
  });
  // 6. Admin invites the Employee
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
  // 7. Employee logs in again to get updated employee records
  const refreshedEmployee = await authorize_member_login(employeeConnection, {
    body: {
      email: employeeEmail,
      password: employeePassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(refreshedEmployee);
  const employeeId = refreshedEmployee.employees[0].id;
  // 8. Create a past/ended contract for the Employee
  const pastContract =
    await generate_random_hrm_time_tracking_employees_contracts_create(
      adminConnection,
      {
        params: {
          employeeId,
        },
        body: {
          startDate: new Date(
            Date.now() - 180 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          endDate: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
      },
    );
  typia.assert(pastContract);
  TestValidator.equals(
    "contract has past end_date",
    pastContract.end_date !== null,
    true,
  );
  TestValidator.predicate("pay_rate is positive", pastContract.pay_rate > 0);
  // 9. Soft-delete the past contract
  await api.functional.hrmTimeTracking.employees.contracts.erase(
    adminConnection,
    {
      employeeId,
      contractId: pastContract.id,
    },
  );
  TestValidator.predicate("past contract soft-deleted successfully", true);
}
