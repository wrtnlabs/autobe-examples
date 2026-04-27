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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingInvitation";
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

export async function test_api_invitation_list_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A joins
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Create organization
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberAConnection,
      {},
    );
  typia.assert(organization);
  // 3. Switch active organization context to the created org
  const switchedOrg =
    await api.functional.hrmTimeTracking.member.switch_organization.switchOrganization(
      memberAConnection,
      {
        organizationId: organization.id,
      },
    );
  typia.assert(switchedOrg);
  // 4. Create a custom role in the organization
  const role =
    await generate_random_hrm_time_tracking_member_organizations_roles_create(
      memberAConnection,
      {
        params: { organizationId: organization.id },
      },
    );
  typia.assert(role);
  // 5. Invite an unregistered email → creates a 'pending' invitation
  const unregisteredEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const pendingInvitation =
    await generate_random_hrm_time_tracking_member_invitations_create(
      memberAConnection,
      {
        body: {
          email: unregisteredEmail,
          role_id: role.id,
        },
      },
    );
  typia.assert(pendingInvitation);
  TestValidator.equals(
    "pending invitation status",
    pendingInvitation.status,
    "pending",
  );
  // 6. Join as member B (different email)
  const memberBEmail: string = typia.random<string & tags.Format<"email">>();
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: { email: memberBEmail },
  });
  typia.assert(memberB);
  // 7. Invite member B's email from member A → auto-creates an 'accepted' invitation
  const acceptedInvitation =
    await generate_random_hrm_time_tracking_member_invitations_create(
      memberAConnection,
      {
        body: {
          email: memberBEmail,
          role_id: role.id,
        },
      },
    );
  typia.assert(acceptedInvitation);
  TestValidator.equals(
    "accepted invitation status",
    acceptedInvitation.status,
    "accepted",
  );
  // 8. Filter by status ['pending']
  const pendingPage =
    await api.functional.hrmTimeTracking.member.invitations.index(
      memberAConnection,
      {
        body: {
          status: ["pending"] satisfies string[] & tags.UniqueItems,
          page: 1,
          limit: 10,
        } satisfies IHrmTimeTrackingInvitation.IRequest,
      },
    );
  typia.assert(pendingPage);
  TestValidator.equals(
    "pending filter returns one invitation",
    pendingPage.data.length,
    1,
  );
  TestValidator.equals(
    "pending invitation ID matches",
    pendingPage.data[0].id,
    pendingInvitation.id,
  );
  TestValidator.equals(
    "acceptor is null for pending",
    pendingPage.data[0].acceptor,
    null,
  );
  // 9. Filter by status ['accepted']
  const acceptedPage =
    await api.functional.hrmTimeTracking.member.invitations.index(
      memberAConnection,
      {
        body: {
          status: ["accepted"] satisfies string[] & tags.UniqueItems,
          page: 1,
          limit: 10,
        } satisfies IHrmTimeTrackingInvitation.IRequest,
      },
    );
  typia.assert(acceptedPage);
  TestValidator.equals(
    "accepted filter returns one invitation",
    acceptedPage.data.length,
    1,
  );
  TestValidator.equals(
    "accepted invitation ID matches",
    acceptedPage.data[0].id,
    acceptedInvitation.id,
  );
  TestValidator.notEquals(
    "acceptor is populated for accepted",
    acceptedPage.data[0].acceptor,
    null,
  );
  // 10. No status filter → both invitations appear
  const allPage = await api.functional.hrmTimeTracking.member.invitations.index(
    memberAConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IHrmTimeTrackingInvitation.IRequest,
    },
  );
  typia.assert(allPage);
  TestValidator.equals(
    "unfiltered returns both invitations",
    allPage.data.length,
    2,
  );
  TestValidator.equals(
    "total records count is 2",
    allPage.pagination.records,
    2,
  );
  // 11. Validate pagination metadata
  TestValidator.equals("current page is 1", allPage.pagination.current, 1);
  TestValidator.equals("page limit is 10", allPage.pagination.limit, 10);
  TestValidator.equals("total pages is 1", allPage.pagination.pages, 1);
}
