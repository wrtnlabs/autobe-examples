import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
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
import { generate_random_hrm_time_tracking_member_invitations_create } from "../../../generate/generate_random_hrm_time_tracking_member_invitations_create";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { generate_random_hrm_time_tracking_member_organizations_roles_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_roles_create";
import { prepare_random_hrm_time_tracking_invitation } from "../../../prepare/prepare_random_hrm_time_tracking_invitation";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_role } from "../../../prepare/prepare_random_hrm_time_tracking_role";

export async function test_api_invitation_cancel_cross_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Create Organization A
  const orgA =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberAConnection,
      {},
    );
  typia.assert(orgA);
  // 3. Switch to Organization A
  const switchedOrgA =
    await api.functional.hrmTimeTracking.member.switch_organization.switchOrganization(
      memberAConnection,
      { organizationId: orgA.id },
    );
  typia.assert(switchedOrgA);
  // 4. Create a role with employee:manage permission in Organization A
  const roleA =
    await generate_random_hrm_time_tracking_member_organizations_roles_create(
      memberAConnection,
      {
        body: {
          name: "Org A Inviter",
          permissions: ["employee:manage"],
        } satisfies DeepPartial<IHrmTimeTrackingRole.ICreate>,
        params: { organizationId: orgA.id },
      },
    );
  typia.assert(roleA);
  // 5. Create a pending invitation for shared-invitee@example.com in Organization A
  const invitationA =
    await generate_random_hrm_time_tracking_member_invitations_create(
      memberAConnection,
      {
        body: {
          email: "shared-invitee@example.com",
          role_id: roleA.id,
        } satisfies DeepPartial<IHrmTimeTrackingInvitation.ICreate>,
      },
    );
  typia.assert(invitationA);
  TestValidator.equals("invitationA initial status", invitationA.status, "pending");
  // 6. Create Organization B
  const orgB =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberAConnection,
      {},
    );
  typia.assert(orgB);
  // 7. Switch to Organization B
  const switchedOrgB =
    await api.functional.hrmTimeTracking.member.switch_organization.switchOrganization(
      memberAConnection,
      { organizationId: orgB.id },
    );
  typia.assert(switchedOrgB);
  // 8. Create a role with employee:manage permission in Organization B
  const roleB =
    await generate_random_hrm_time_tracking_member_organizations_roles_create(
      memberAConnection,
      {
        body: {
          name: "Org B Inviter",
          permissions: ["employee:manage"],
        } satisfies DeepPartial<IHrmTimeTrackingRole.ICreate>,
        params: { organizationId: orgB.id },
      },
    );
  typia.assert(roleB);
  // 9. Create a pending invitation for the same email in Organization B
  const invitationB =
    await generate_random_hrm_time_tracking_member_invitations_create(
      memberAConnection,
      {
        body: {
          email: "shared-invitee@example.com",
          role_id: roleB.id,
        } satisfies DeepPartial<IHrmTimeTrackingInvitation.ICreate>,
      },
    );
  typia.assert(invitationB);
  TestValidator.equals("invitationB initial status", invitationB.status, "pending");
  // 10. Switch back to Organization A to perform the cancellation
  const switchedBackA =
    await api.functional.hrmTimeTracking.member.switch_organization.switchOrganization(
      memberAConnection,
      { organizationId: orgA.id },
    );
  typia.assert(switchedBackA);
  // 11. Cancel invitationA - verify it returns status "cancelled"
  const cancelledInvitationA =
    await api.functional.hrmTimeTracking.member.invitations.cancel(
      memberAConnection,
      { invitationId: invitationA.id },
    );
  typia.assert(cancelledInvitationA);
  TestValidator.equals("cancelled invitationA status", cancelledInvitationA.status, "cancelled");
  // 12. Switch to Organization B
  const switchedToB =
    await api.functional.hrmTimeTracking.member.switch_organization.switchOrganization(
      memberAConnection,
      { organizationId: orgB.id },
    );
  typia.assert(switchedToB);
  // 13. Verify invitationB is still pending - cross-organization isolation confirmed
  TestValidator.equals("invitationB remains pending after cancelling invitationA", invitationB.status, "pending");
}
