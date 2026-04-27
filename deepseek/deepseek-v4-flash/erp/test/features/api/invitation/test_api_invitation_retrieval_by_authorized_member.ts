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

export async function test_api_invitation_retrieval_by_authorized_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  // 2. Create an organization (member becomes Owner with employee:manage permission)
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  // 3. Create a custom role with at least one permission
  const role =
    await generate_random_hrm_time_tracking_member_organizations_roles_create(
      memberConnection,
      {
        params: {
          organizationId: organization.id,
        },
      },
    );
  // 4. Invite an external email (no existing account) using the created role
  const invitation =
    await generate_random_hrm_time_tracking_member_invitations_create(
      memberConnection,
      {
        body: {
          role_id: role.id satisfies string,
        },
      },
    );
  typia.assert(invitation);
  // 5. Retrieve the invitation by its ID
  const retrieved = await api.functional.hrmTimeTracking.member.invitations.at(
    memberConnection,
    {
      invitationId: invitation.id,
    },
  );
  typia.assert(retrieved);
  // 6. Validate response matches the created invitation
  TestValidator.equals("invitation id", retrieved.id, invitation.id);
  TestValidator.equals("invitation email", retrieved.email, invitation.email);
  TestValidator.equals("invitation status", retrieved.status, "pending");
  TestValidator.equals("organization id", retrieved.organization.id, organization.id);
  TestValidator.equals("inviter id", retrieved.inviter.id, member.id);
  TestValidator.equals("inviter email", retrieved.inviter.email, member.email);
  TestValidator.equals("inviter display_name", retrieved.inviter.display_name, member.display_name);
  TestValidator.equals("role id", retrieved.role.id, role.id);
  TestValidator.equals("role name", retrieved.role.name, role.name);
  TestValidator.equals("acceptor", retrieved.acceptor, null);
  TestValidator.equals("expired_at", retrieved.expired_at, null);
  TestValidator.equals("accepted_at", retrieved.accepted_at, null);
  TestValidator.equals("deleted_at", retrieved.deleted_at, null);
  TestValidator.predicate("created_at present", !!retrieved.created_at);
}