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

export async function test_api_contract_active_soft_delete(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Admin member
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_member_join(adminConnection, {});
  typia.assert(admin);
  // 2. Create an organization owned by Admin
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      adminConnection,
      {},
    );
  typia.assert(organization);
  // 3. Switch Admin's active organization context to the new org
  const switchedOrg =
    await api.functional.hrmTimeTracking.member.switch_organization.switchOrganization(
      adminConnection,
      { organizationId: organization.id },
    );
  typia.assert(switchedOrg);
  // 4. Create a custom role with a set of permissions
  const role =
    await generate_random_hrm_time_tracking_member_organizations_roles_create(
      adminConnection,
      { params: { organizationId: organization.id } },
    );
  typia.assert(role);
  // 5. Register Employee member (with known credentials for later re-login)
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeEmail = typia.random<string & tags.Format<"email">>();
  const employeePassword = RandomGenerator.alphaNumeric(16);
  const employeeAfterJoin = await authorize_member_join(employeeConnection, {
    body: {
      email: employeeEmail,
      password: employeePassword,
    },
  });
  typia.assert(employeeAfterJoin);
  // 6. Invite Employee by email — since employee is already registered, this auto-creates the employee record
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
  // 7. Re-login Employee to get updated profile with the new employee record
  const employeeConnection2: api.IConnection = { host: connection.host };
  const employeeAuthorized = await authorize_member_login(employeeConnection2, {
    body: {
      email: employeeEmail,
      password: employeePassword,
      href: "",
      referrer: "",
    },
  });
  typia.assert(employeeAuthorized);
  // 8. Find the employee record for the target organization
  const employeeRecord = employeeAuthorized.employees.find(
    (e) => e.role.organization.id === organization.id,
  );
  if (!employeeRecord)
    throw new Error("Employee record not found after invitation");
  const employeeId = employeeRecord.id;
  // 9. Create an active contract (end_date = null) for the Employee
  const contract =
    await generate_random_hrm_time_tracking_employees_contracts_create(
      adminConnection,
      {
        params: { employeeId },
        body: {
          endDate: undefined,
        },
      },
    );
  typia.assert(contract);
  // 10. Validate the contract is active (end_date is null)
  TestValidator.equals("contract should be active", contract.end_date, null);
  // 11. Soft-delete the contract
  await api.functional.hrmTimeTracking.employees.contracts.erase(
    adminConnection,
    {
      employeeId,
      contractId: contract.id,
    },
  );
}
