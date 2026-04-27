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

/**
 * Test that a member with `employee:manage` permission successfully cancels a pending invitation.
 *
 * Validates the complete invitation cancellation flow from member registration through invitation creation and cancellation. Ensures that the cancelled invitation has the correct status transition to "cancelled" and that timestamps which were never set (expired_at, accepted_at) remain as null or undefined.
 *
 * 1. Register Member A via the join endpoint to obtain an authenticated session.
 * 2. Create an organization owned by Member A.
 * 3. Switch Member A's active organization context to the newly created organization.
 * 4. Create a custom role with `employee:manage` permission in the organization.
 * 5. Create a pending invitation for a non-registered email address with the created role.
 * 6. Cancel the pending invitation via the cancel endpoint.
 * 7. Verify the cancelled invitation has status "cancelled" and that expired_at and accepted_at are both null or undefined.
 */
export async function test_api_invitation_cancel_pending_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register Member A
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Member A creates an organization
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: Member A switches active context to the new organization
  await api.functional.hrmTimeTracking.member.switch_organization.switchOrganization(
    memberConnection,
    { organizationId: organization.id },
  );
  // Step 4: Member A creates a custom role with employee:manage permission
  const role =
    await generate_random_hrm_time_tracking_member_organizations_roles_create(
      memberConnection,
      {
        params: { organizationId: organization.id },
        body: {
          name: "InviteManager",
          permissions: ["employee:manage"],
        },
      },
    );
  typia.assert(role);
  // Step 5: Member A creates a pending invitation for a non-registered email
  const invitationEmail: string = typia.random<string & tags.Format<"email">>();
  const invitation =
    await generate_random_hrm_time_tracking_member_invitations_create(
      memberConnection,
      {
        body: {
          email: invitationEmail,
          role_id: role.id,
        },
      },
    );
  typia.assert(invitation);
  // Step 6: Member A cancels the invitation
  const cancelledInvitation =
    await api.functional.hrmTimeTracking.member.invitations.cancel(
      memberConnection,
      { invitationId: invitation.id },
    );
  typia.assert(cancelledInvitation);
  // Step 7: Verify the response
  TestValidator.equals(
    "status is cancelled",
    cancelledInvitation.status,
    "cancelled",
  );
  TestValidator.predicate(
    "expired_at is not set (null or undefined)",
    cancelledInvitation.expired_at === null ||
      cancelledInvitation.expired_at === undefined,
  );
  TestValidator.predicate(
    "accepted_at is not set (null or undefined)",
    cancelledInvitation.accepted_at === null ||
      cancelledInvitation.accepted_at === undefined,
  );
}
