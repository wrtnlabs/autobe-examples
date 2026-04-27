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
import type { IHrmTimeTrackingProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMember";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_invitations_create } from "../../../generate/generate_random_hrm_time_tracking_member_invitations_create";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { prepare_random_hrm_time_tracking_invitation } from "../../../prepare/prepare_random_hrm_time_tracking_invitation";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";

export async function test_api_employee_view_cross_organization_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Member A with known credentials
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberAPassword = RandomGenerator.alphaNumeric(16);
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: memberAEmail,
      password: memberAPassword,
    },
  });
  typia.assert(memberA);
  // 2. Register Member B with known credentials
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberBPassword = RandomGenerator.alphaNumeric(16);
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: memberBEmail,
      password: memberBPassword,
    },
  });
  typia.assert(memberB);
  // 3. Member A creates Organization A
  const orgAInput = prepare_random_hrm_time_tracking_organization();
  const orgA =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberAConnection,
      {
        body: orgAInput,
      },
    );
  typia.assert(orgA);
  // 4. Member A switches to Organization A context
  await api.functional.hrmTimeTracking.member.switch_organization.switchOrganization(
    memberAConnection,
    {
      organizationId: orgA.id,
    },
  );
  // 5. Re-authenticate Member A to get the fresh profile with employee records
  // (the Owner employee record is created when Org A was created)
  const refreshedA = await api.functional.hrmTimeTracking.auth.member.login(
    memberAConnection,
    {
      body: {
        email: memberAEmail,
        password: memberAPassword,
        href: "",
        referrer: "",
      },
    },
  );
  typia.assert(refreshedA);
  // 6. Extract the Owner role_id and Member A's employee ID from the refreshed profile
  const ownerRoleId = refreshedA.employees[0]!.role.id;
  const memberAemployeeId = refreshedA.employees[0]!.id;
  // 7. Member A invites Member B to Organization A
  // Since Member B is already registered, this auto-creates an employee record for B
  const invitation =
    await generate_random_hrm_time_tracking_member_invitations_create(
      memberAConnection,
      {
        body: {
          email: memberBEmail,
          role_id: ownerRoleId,
        },
      },
    );
  typia.assert(invitation);
  // 8. Re-authenticate Member B to get the fresh profile with the newly created employee record
  const refreshedB = await api.functional.hrmTimeTracking.auth.member.login(
    memberBConnection,
    {
      body: {
        email: memberBEmail,
        password: memberBPassword,
        href: "",
        referrer: "",
      },
    },
  );
  typia.assert(refreshedB);
  // 9. Extract Member B's employee ID in Organization A
  const memberBemployee = refreshedB.employees.find(
    (emp) => emp.member.email === memberBEmail,
  );
  const memberBemployeeId = memberBemployee!.id;
  // 10. Register Member C with known credentials
  const memberCEmail = typia.random<string & tags.Format<"email">>();
  const memberCPassword = RandomGenerator.alphaNumeric(16);
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberC = await authorize_member_join(memberCConnection, {
    body: {
      email: memberCEmail,
      password: memberCPassword,
    },
  });
  typia.assert(memberC);
  // 11. Member C creates Organization B
  const orgBInput = prepare_random_hrm_time_tracking_organization();
  const orgB =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberCConnection,
      {
        body: orgBInput,
      },
    );
  typia.assert(orgB);
  // 12. Member C switches to Organization B context
  await api.functional.hrmTimeTracking.member.switch_organization.switchOrganization(
    memberCConnection,
    {
      organizationId: orgB.id,
    },
  );
  // 13. Re-authenticate Member C to get fresh profile (verify Org B context)
  const refreshedC = await api.functional.hrmTimeTracking.auth.member.login(
    memberCConnection,
    {
      body: {
        email: memberCEmail,
        password: memberCPassword,
        href: "",
        referrer: "",
      },
    },
  );
  typia.assert(refreshedC);
  // 14. Validate that Member C (in Org B) CAN view their own employee record
  const memberCemployee = refreshedC.employees.find(
    (emp) => emp.member.email === memberCEmail,
  );
  const memberCemployeeId = memberCemployee!.id;
  const ownEmployee = await api.functional.hrmTimeTracking.employees.at(
    memberCConnection,
    {
      employeeId: memberCemployeeId,
    },
  );
  typia.assert(ownEmployee);
  // 15. Member C tries to view Member B's employee record from Organization B context
  // This MUST fail with 404 because the employee belongs to Organization A, not B
  await TestValidator.httpError(
    "cross-organization employee access should be rejected with 404",
    404,
    async () => {
      await api.functional.hrmTimeTracking.employees.at(memberCConnection, {
        employeeId: memberBemployeeId,
      });
    },
  );
  // 16. Also validate that Member A (in Org A) CAN view Member B's employee record
  // This confirms the employee exists and is accessible within the correct org context
  const bFromOrgA = await api.functional.hrmTimeTracking.employees.at(
    memberAConnection,
    {
      employeeId: memberBemployeeId,
    },
  );
  typia.assert(bFromOrgA);
  TestValidator.equals(
    "employee belongs to Org A",
    bFromOrgA.organization.id,
    orgA.id,
  );
  TestValidator.equals(
    "employee owns the same record",
    bFromOrgA.id,
    memberBemployeeId,
  );
  // 17. Also validate that Member C CAN view Member A's employee record from Org B
  // And conversely, Member A cannot view Member C's employee from Org A
  await TestValidator.httpError(
    "cross-organization reverse access should also be rejected with 404",
    404,
    async () => {
      await api.functional.hrmTimeTracking.employees.at(memberAConnection, {
        employeeId: memberCemployeeId,
      });
    },
  );
}
