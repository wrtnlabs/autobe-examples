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
 * Test the pending invitation flow when inviting an email that has no registered member account.
 *
 * Validates that inviting a completely new (unregistered) email address creates an invitation record in the 'pending' state. Verifies that the invitation correctly references the invited email, the assigned role, the inviter's identity, and the target organization. Ensures lifecycle timestamps (expired_at, accepted_at) are null for a newly created pending invitation.
 *
 * 1. Member joins the platform and authenticates.
 * 2. Member creates an organization (becoming its owner).
 * 3. Member creates a custom role within the organization.
 * 4. Member invites a non-existent email address with the created role.
 * 5. Validates the invitation has status 'pending', correct references, and null lifecycle timestamps.
 */
export async function test_api_invitation_new_user_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join a new member and get authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {});
  typia.assert(authorizedMember);
  // 2. Create an organization
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create a custom role within the organization
  const role =
    await generate_random_hrm_time_tracking_member_organizations_roles_create(
      memberConnection,
      {
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(role);
  // 4. Invite a non-existent email address
  const invitation =
    await generate_random_hrm_time_tracking_member_invitations_create(
      memberConnection,
      {
        body: {
          email: "newuser@example.com",
          role_id: role.id,
        },
      },
    );
  typia.assert(invitation);
  // 5. Validate invitation properties
  TestValidator.equals("status is pending", invitation.status, "pending");
  TestValidator.equals(
    "invited email",
    invitation.email,
    "newuser@example.com",
  );
  TestValidator.equals("role reference", invitation.role.id, role.id);
  TestValidator.equals(
    "inviter reference",
    invitation.inviter.id,
    authorizedMember.id,
  );
  TestValidator.equals("expired_at is null", invitation.expired_at, null);
  TestValidator.equals("accepted_at is null", invitation.accepted_at, null);
  TestValidator.equals(
    "organization reference",
    invitation.organization.id,
    organization.id,
  );
}
