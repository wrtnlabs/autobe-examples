import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmInvitation";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_organizations_invitations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_invitations_create";
import { prepare_random_erp_hrm_invitation } from "../../../prepare/prepare_random_erp_hrm_invitation";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";

export async function test_api_invitation_list_auto_accepted_on_signup(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register Owner member
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuthorized = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(ownerAuthorized);
  // Step 2: Create organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      ownerConnection,
      {},
    );
  typia.assert(organization);
  const organizationId = organization.id;
  // Step 3: Prepare invited email for future employee
  const invitedEmail = typia.random<string & tags.Format<"email">>();
  // Step 4: Issue a pending invitation to the future employee email
  // Need to get the owner's role id for the invitation
  const ownerRoleId = organization.owner.role.id;
  const invitation =
    await generate_random_erp_hrm_member_organizations_invitations_create(
      ownerConnection,
      {
        body: {
          email: invitedEmail,
          roleId: ownerRoleId,
          employmentType: "full-time",
        },
        params: { organizationId },
      },
    );
  typia.assert(invitation);
  // Step 5: Verify initial state - 1 pending invitation with memberId === null
  const initialList =
    await api.functional.erpHrm.member.organizations.invitations.index(
      ownerConnection,
      {
        organizationId,
        body: { status: ["pending"] } satisfies IErpHrmInvitation.IRequest,
      },
    );
  typia.assert(initialList);
  TestValidator.equals(
    "initial pending count",
    initialList.pagination.records,
    1,
  );
  TestValidator.predicate(
    "initial invitation memberId is null",
    initialList.data[0]!.memberId === null,
  );
  TestValidator.equals(
    "initial invitation email matches",
    initialList.data[0]!.email,
    invitedEmail,
  );
  // Step 6: Register the new member using the invited email (triggers auto-accept)
  const newMemberConnection: api.IConnection = { host: connection.host };
  const newMemberAuthorized = await authorize_member_join(newMemberConnection, {
    body: {
      email: invitedEmail,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(newMemberAuthorized);
  const newMemberId = newMemberAuthorized.member.id;
  // Step 7: Verify invitation is now accepted - empty body (no filter)
  const allList =
    await api.functional.erpHrm.member.organizations.invitations.index(
      ownerConnection,
      {
        organizationId,
        body: {} satisfies IErpHrmInvitation.IRequest,
      },
    );
  typia.assert(allList);
  TestValidator.equals(
    "total records after signup",
    allList.pagination.records,
    1,
  );
  TestValidator.equals(
    "invitation status is accepted",
    allList.data[0]!.status,
    "accepted",
  );
  TestValidator.predicate(
    "memberId is not null",
    allList.data[0]!.memberId !== null,
  );
  TestValidator.equals(
    "memberId matches new member",
    allList.data[0]!.memberId,
    newMemberId,
  );
  TestValidator.equals(
    "invitation email matches",
    allList.data[0]!.email,
    invitedEmail,
  );
  // Step 8: Filter by pending - should return 0
  const pendingList =
    await api.functional.erpHrm.member.organizations.invitations.index(
      ownerConnection,
      {
        organizationId,
        body: { status: ["pending"] } satisfies IErpHrmInvitation.IRequest,
      },
    );
  typia.assert(pendingList);
  TestValidator.equals("pending count is 0", pendingList.pagination.records, 0);
  // Step 9: Filter by accepted - should return 1
  const acceptedList =
    await api.functional.erpHrm.member.organizations.invitations.index(
      ownerConnection,
      {
        organizationId,
        body: { status: ["accepted"] } satisfies IErpHrmInvitation.IRequest,
      },
    );
  typia.assert(acceptedList);
  TestValidator.equals(
    "accepted count is 1",
    acceptedList.pagination.records,
    1,
  );
  // Step 10: Issue 2 additional invitations for sort order testing
  const extraEmail1 = typia.random<string & tags.Format<"email">>();
  const extraEmail2 = typia.random<string & tags.Format<"email">>();
  // Use a non-owner role (employee role) - we need a different role to invite
  // Actually we can reuse the owner role id since we just need to send invitations
  const invitationExtra1 =
    await generate_random_erp_hrm_member_organizations_invitations_create(
      ownerConnection,
      {
        body: {
          email: extraEmail1,
          roleId: ownerRoleId,
          employmentType: "part-time",
        },
        params: { organizationId },
      },
    );
  typia.assert(invitationExtra1);
  const invitationExtra2 =
    await generate_random_erp_hrm_member_organizations_invitations_create(
      ownerConnection,
      {
        body: {
          email: extraEmail2,
          roleId: ownerRoleId,
          employmentType: "contractor",
        },
        params: { organizationId },
      },
    );
  typia.assert(invitationExtra2);
  // Step 11: Sort ascending (oldest first)
  const ascList =
    await api.functional.erpHrm.member.organizations.invitations.index(
      ownerConnection,
      {
        organizationId,
        body: { sort: "createdAt_asc" } satisfies IErpHrmInvitation.IRequest,
      },
    );
  typia.assert(ascList);
  TestValidator.equals("asc total records", ascList.pagination.records, 3);
  // First element should be the oldest (original invitation)
  TestValidator.predicate("asc order: oldest first", () => {
    const dates = ascList.data.map((inv) => new Date(inv.created_at).getTime());
    for (let i = 0; i < dates.length - 1; i++) {
      if (dates[i]! > dates[i + 1]!) return false;
    }
    return true;
  });
  // Step 12: Sort descending (newest first)
  const descList =
    await api.functional.erpHrm.member.organizations.invitations.index(
      ownerConnection,
      {
        organizationId,
        body: { sort: "createdAt_desc" } satisfies IErpHrmInvitation.IRequest,
      },
    );
  typia.assert(descList);
  TestValidator.equals("desc total records", descList.pagination.records, 3);
  // First element should be the newest
  TestValidator.predicate("desc order: newest first", () => {
    const dates = descList.data.map((inv) =>
      new Date(inv.created_at).getTime(),
    );
    for (let i = 0; i < dates.length - 1; i++) {
      if (dates[i]! < dates[i + 1]!) return false;
    }
    return true;
  });
}
