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
 * Test that cancelling an already-cancelled employee invitation returns a 422 business error.
 *
 * This test validates the business rule that only invitations in `pending` status can be cancelled. After successfully cancelling a pending invitation, attempting to cancel the same invitation again must be rejected with an HTTP 422 status.
 *
 * The test follows the standard setup flow: member registration → organization creation → role creation → pending invitation creation → first cancellation succeeds → second cancellation fails.
 *
 * 1. Register a new member account via `authorize_member_join`.
 * 2. Create an organization via `generate_random_hrm_time_tracking_member_organizations_create`.
 * 3. Create a custom role via `generate_random_hrm_time_tracking_member_organizations_roles_create`.
 * 4. Create a pending invitation targeting a non-registered email via `generate_random_hrm_time_tracking_member_invitations_create`.
 * 5. Cancel the invitation — first call succeeds (void return).
 * 6. Cancel the same invitation again — second call is rejected with HTTP 422.
 */
export async function test_api_invitation_cancel_already_cancelled(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
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
  // 4. Create a pending invitation (non-registered email)
  const invitation =
    await generate_random_hrm_time_tracking_member_invitations_create(
      memberConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          role_id: role.id,
        },
      },
    );
  typia.assert(invitation);
  // 5. First cancellation — should succeed
  await api.functional.hrmTimeTracking.member.invitations.erase(
    memberConnection,
    {
      invitationId: invitation.id,
    },
  );
  // 6. Second cancellation — should fail with 422
  await TestValidator.httpError(
    "cancel already cancelled invitation",
    422,
    async () => {
      await api.functional.hrmTimeTracking.member.invitations.erase(
        memberConnection,
        {
          invitationId: invitation.id,
        },
      );
    },
  );
}
