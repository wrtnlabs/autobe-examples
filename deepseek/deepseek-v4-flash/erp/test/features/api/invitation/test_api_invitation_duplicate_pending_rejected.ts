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
 * Test that sending a duplicate invitation to the same unregistered email for the same organization is rejected with a conflict error.
 *
 * Verifies the invitation lifecycle by first creating a valid pending invitation for a non-existent email, then attempting the same operation again. The duplicate request must be rejected with an HTTP 409 Conflict error while the original pending invitation record remains unchanged.
 *
 * 1. Join a new member who will own the organization and send invitations.
 * 2. Create an organization owned by the joined member.
 * 3. Create a custom role within the organization for the invitation to reference.
 * 4. Invite a randomly generated non-existent email — succeeds with status='pending'.
 * 5. Invite the same email again — rejected with 409 Conflict.
 */
export async function test_api_invitation_duplicate_pending_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
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
        params: { organizationId: organization.id },
      },
    );
  typia.assert(role);
  // 4. First invitation — should succeed and return pending status
  const invitedEmail = typia.random<string & tags.Format<"email">>();
  const firstInvitation =
    await generate_random_hrm_time_tracking_member_invitations_create(
      memberConnection,
      {
        body: { email: invitedEmail, role_id: role.id },
      },
    );
  typia.assert(firstInvitation);
  TestValidator.equals(
    "first invitation status is pending",
    firstInvitation.status,
    "pending",
  );
  // 5. Second invitation with same email — should be rejected with 409 Conflict
  await TestValidator.httpError(
    "duplicate invitation rejected with 409",
    409,
    async () => {
      await generate_random_hrm_time_tracking_member_invitations_create(
        memberConnection,
        {
          body: { email: invitedEmail, role_id: role.id },
        },
      );
    },
  );
}
