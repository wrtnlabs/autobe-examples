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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingEmployee";
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
import { prepare_random_hrm_time_tracking_employee_contract } from "../../../prepare/prepare_random_hrm_time_tracking_employee_contract";
import { prepare_random_hrm_time_tracking_invitation } from "../../../prepare/prepare_random_hrm_time_tracking_invitation";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";

export async function test_api_organization_deletion_blocked_by_active_contracts(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register Owner
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  // Step 2: Create Organization
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      ownerConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: Register Employee (second member)
  const employeeEmail = typia.random<string & tags.Format<"email">>();
  const employeeConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(employeeConnection, {
    body: { email: employeeEmail },
  });
  // Step 4: List employees to find available role for invitation
  const employeePage = await api.functional.hrmTimeTracking.employees.index(
    ownerConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IHrmTimeTrackingEmployee.IRequest,
    },
  );
  typia.assert(employeePage);
  const ownerRole = employeePage.data[0]!.role;
  // Step 5: Invite Employee by email
  const invitation =
    await generate_random_hrm_time_tracking_member_invitations_create(
      ownerConnection,
      {
        body: {
          email: employeeEmail,
          role_id: ownerRole.id,
        },
      },
    );
  typia.assert(invitation);
  // Step 6: List employees to find the invited employee's ID
  const employeePage2 = await api.functional.hrmTimeTracking.employees.index(
    ownerConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IHrmTimeTrackingEmployee.IRequest,
    },
  );
  typia.assert(employeePage2);
  const invitedEmployee = employeePage2.data.find(
    (e) => e.member.email === employeeEmail,
  )!;
  // Step 7: Create an active employment contract (endDate: undefined = ongoing/active)
  const contract =
    await generate_random_hrm_time_tracking_employees_contracts_create(
      ownerConnection,
      {
        params: {
          employeeId: invitedEmployee.id,
        },
        body: {
          startDate: new Date().toISOString(),
          endDate: undefined,
        },
      },
    );
  typia.assert(contract);
  // Step 8: Attempt to delete organization → expect 409 Conflict
  await TestValidator.httpError(
    "organization deletion blocked by active contracts",
    409,
    async () => {
      await api.functional.hrmTimeTracking.member.organizations.erase(
        ownerConnection,
        {
          organizationId: organization.id,
        },
      );
    },
  );
}
