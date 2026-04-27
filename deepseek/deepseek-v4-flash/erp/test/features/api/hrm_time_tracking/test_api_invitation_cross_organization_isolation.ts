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

export async function test_api_invitation_cross_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register Member A
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  // Step 2: Create Organization A (Member A is owner)
  const organizationA =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberAConnection,
      {},
    );
  typia.assert(organizationA);
  // Step 3: Create a custom role in Organization A with employee:manage permission
  const role =
    await generate_random_hrm_time_tracking_member_organizations_roles_create(
      memberAConnection,
      {
        params: { organizationId: organizationA.id },
        body: {
          name: RandomGenerator.name(2),
          permissions: ["employee:manage"],
        },
      },
    );
  typia.assert(role);
  // Step 4: Create a pending invitation in Organization A for a non-existent email
  const invitation =
    await generate_random_hrm_time_tracking_member_invitations_create(
      memberAConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          role_id: role.id,
        },
      },
    );
  typia.assert(invitation);
  // Step 5: Register Member B (different email)
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // Step 6: Create Organization B (Member B is owner)
  const organizationB =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberBConnection,
      {},
    );
  typia.assert(organizationB);
  // Step 7: Switch Member B's active context to Organization B
  const switchedOrg =
    await api.functional.hrmTimeTracking.member._switch.organizations.change(
      memberBConnection,
      {
        organizationId: organizationB.id,
      },
    );
  typia.assert(switchedOrg);
  // Step 8: As Member B in Org B context, try to access Member A's invitation (belongs to Org A)
  await TestValidator.httpError(
    "cross-organization invitation access should return 404",
    404,
    async () => {
      await api.functional.hrmTimeTracking.member.invitations.at(
        memberBConnection,
        {
          invitationId: invitation.id,
        },
      );
    },
  );
}
