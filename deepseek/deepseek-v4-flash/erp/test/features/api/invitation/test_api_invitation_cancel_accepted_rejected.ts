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

export async function test_api_invitation_cancel_accepted_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Member A (the future organization owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  // 2. Register Member B with a specific email for invitation
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  await authorize_member_join(memberBConnection, {
    body: { email: memberBEmail },
  });
  // 3. Member A creates an organization
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberAConnection,
      {},
    );
  typia.assert(organization);
  // 4. Member A switches to the new organization
  const switchedOrg =
    await api.functional.hrmTimeTracking.member.switch_organization.switchOrganization(
      memberAConnection,
      { organizationId: organization.id },
    );
  typia.assert(switchedOrg);
  // 5. Member A creates a custom role with employee:manage permission
  const role =
    await generate_random_hrm_time_tracking_member_organizations_roles_create(
      memberAConnection,
      {
        params: { organizationId: organization.id },
        body: { permissions: ["employee:manage"] },
      },
    );
  typia.assert(role);
  // 6. Member A invites Member B's email
  // Since Member B is already a registered user, the system auto-accepts
  const invitation =
    await generate_random_hrm_time_tracking_member_invitations_create(
      memberAConnection,
      {
        body: {
          email: memberBEmail,
          role_id: role.id,
        },
      },
    );
  typia.assert(invitation);
  // 7-8. Attempt to cancel the accepted invitation — should return 422
  await TestValidator.httpError(
    "cancelling accepted invitation should return 422",
    422,
    async () => {
      await api.functional.hrmTimeTracking.member.invitations.cancel(
        memberAConnection,
        { invitationId: invitation.id },
      );
    },
  );
}
