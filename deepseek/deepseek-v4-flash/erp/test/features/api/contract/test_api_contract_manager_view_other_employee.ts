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

export async function test_api_contract_manager_view_other_employee(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register Member A (Owner)
  const memberAConn: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConn, {});
  typia.assert(memberAAuth);
  // Step 2: Create organization
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberAConn,
      {},
    );
  typia.assert(organization);
  // Step 3: Register Member B
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberBPassword = RandomGenerator.alphaNumeric(16);
  const memberBConn: api.IConnection = { host: connection.host };
  const memberBAuth1 = await authorize_member_join(memberBConn, {
    body: {
      email: memberBEmail,
      password: memberBPassword,
    },
  });
  typia.assert(memberBAuth1);
  // Step 4: Create a custom role with employee:view permission
  const customRole =
    await generate_random_hrm_time_tracking_member_organizations_roles_create(
      memberAConn,
      {
        params: {
          organizationId: organization.id,
        },
        body: {
          name: "Viewer",
          permissions: ["employee:view"],
        },
      },
    );
  typia.assert(customRole);
  // Step 5: Invite Member B to the organization with the custom role
  const invitation =
    await generate_random_hrm_time_tracking_member_invitations_create(
      memberAConn,
      {
        body: {
          email: memberBEmail,
          role_id: customRole.id,
        },
      },
    );
  typia.assert(invitation);
  // Step 6: Member B logs in to get updated auth with the employee record
  const memberBAuth2 = await authorize_member_login(memberBConn, {
    body: {
      email: memberBEmail,
      password: memberBPassword,
      href: "",
      referrer: "",
    },
  });
  typia.assert(memberBAuth2);
  const memberBEmployee = memberBAuth2.employees[0];
  typia.assertGuard(memberBEmployee!);
  // Step 7: Create a contract for Employee B (Member A with employee:manage creates it)
  const contract =
    await generate_random_hrm_time_tracking_employees_contracts_create(
      memberAConn,
      {
        params: {
          employeeId: memberBEmployee.id,
        },
      },
    );
  typia.assert(contract);
  // Step 8: As Member A (Owner with employee:view), retrieve Employee B's contract
  const retrievedContract =
    await api.functional.hrmTimeTracking.employees.contracts.at(memberAConn, {
      employeeId: memberBEmployee.id,
      contractId: contract.id,
    });
  typia.assert(retrievedContract);
  // Validation
  TestValidator.equals(
    "contract employee ID matches Employee B",
    retrievedContract.employee.id,
    memberBEmployee.id,
  );
}
