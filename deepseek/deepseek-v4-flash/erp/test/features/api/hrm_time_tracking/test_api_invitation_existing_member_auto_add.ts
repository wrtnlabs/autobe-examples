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

export async function test_api_invitation_existing_member_auto_add(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Member A (inviter)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Create Member B (invitee — existing user for auto-add)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 3. Member A creates an organization
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberAConnection,
      {},
    );
  typia.assert(organization);
  // 4. Member A creates a custom role within the organization
  const role =
    await generate_random_hrm_time_tracking_member_organizations_roles_create(
      memberAConnection,
      {
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(role);
  // 5. Member A invites Member B's email — triggers auto-add since Member B already exists
  const invitation =
    await generate_random_hrm_time_tracking_member_invitations_create(
      memberAConnection,
      {
        body: {
          email: memberB.email,
          role_id: role.id,
        },
      },
    );
  typia.assert(invitation);
  // 6. Validate that the invitation was immediately accepted (auto-add flow)
  TestValidator.equals(
    "invitation status is accepted",
    invitation.status,
    "accepted",
  );
  TestValidator.predicate(
    "accepted_at timestamp is set",
    invitation.accepted_at !== null && invitation.accepted_at !== undefined,
  );
  TestValidator.equals(
    "invitation role matches created role",
    invitation.role.id,
    role.id,
  );
  TestValidator.equals(
    "invitation acceptor matches Member B",
    invitation.acceptor?.id,
    memberB.id,
  );
}
