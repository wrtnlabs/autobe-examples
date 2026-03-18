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

export async function test_api_invitation_list_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Owner member and create connection (sets JWT token in headers)
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  // 2. Create organization with owner connection
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      ownerConnection,
      {},
    );
  typia.assert(organization);
  const organizationId = organization.id;
  const roleId = organization.owner.role.id;
  // 3. Register second member (different email, already registered)
  const secondMemberEmail = typia.random<string & tags.Format<"email">>();
  const secondMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(secondMemberConnection, {
    body: { email: secondMemberEmail },
  });
  // 4. Issue invitation to second member's already-registered email
  //    → direct-add flow → invitation status becomes 'accepted'
  const acceptedInvitation =
    await generate_random_erp_hrm_member_organizations_invitations_create(
      ownerConnection,
      {
        body: {
          email: secondMemberEmail,
          roleId: roleId,
          employmentType: "full-time",
        },
        params: { organizationId },
      },
    );
  typia.assert(acceptedInvitation);
  // 5. Issue two invitations to unregistered emails → remain 'pending'
  const suffix1 = RandomGenerator.alphabets(6);
  const suffix2 = RandomGenerator.alphabets(6);
  const pendingEmail1 = `newuser1_${suffix1}@test.com`;
  const pendingEmail2 = `newuser2_${suffix2}@test.com`;
  const pendingInvitation1 =
    await generate_random_erp_hrm_member_organizations_invitations_create(
      ownerConnection,
      {
        body: {
          email: pendingEmail1,
          roleId: roleId,
          employmentType: "full-time",
        },
        params: { organizationId },
      },
    );
  typia.assert(pendingInvitation1);
  const pendingInvitation2 =
    await generate_random_erp_hrm_member_organizations_invitations_create(
      ownerConnection,
      {
        body: {
          email: pendingEmail2,
          roleId: roleId,
          employmentType: "part-time",
        },
        params: { organizationId },
      },
    );
  typia.assert(pendingInvitation2);
  // --- Test execution: Filter by 'pending' ---
  const pendingPage =
    await api.functional.erpHrm.member.organizations.invitations.index(
      ownerConnection,
      {
        organizationId,
        body: { status: ["pending"] } satisfies IErpHrmInvitation.IRequest,
      },
    );
  typia.assert(pendingPage);
  TestValidator.equals(
    "pending filter: records count",
    pendingPage.pagination.records,
    2,
  );
  for (const inv of pendingPage.data) {
    TestValidator.equals("pending filter: status", inv.status, "pending");
  }
  // --- Test execution: Filter by 'accepted' ---
  const acceptedPage =
    await api.functional.erpHrm.member.organizations.invitations.index(
      ownerConnection,
      {
        organizationId,
        body: { status: ["accepted"] } satisfies IErpHrmInvitation.IRequest,
      },
    );
  typia.assert(acceptedPage);
  TestValidator.equals(
    "accepted filter: records count",
    acceptedPage.pagination.records,
    1,
  );
  TestValidator.equals(
    "accepted filter: status",
    acceptedPage.data[0]!.status,
    "accepted",
  );
  TestValidator.predicate(
    "accepted filter: memberId not null",
    acceptedPage.data[0]!.memberId !== null,
  );
  // --- Test execution: Filter by ['pending', 'accepted'] ---
  const allPage =
    await api.functional.erpHrm.member.organizations.invitations.index(
      ownerConnection,
      {
        organizationId,
        body: {
          status: ["pending", "accepted"],
        } satisfies IErpHrmInvitation.IRequest,
      },
    );
  typia.assert(allPage);
  TestValidator.equals(
    "pending+accepted filter: records count",
    allPage.pagination.records,
    3,
  );
  // --- Test execution: Email partial match 'newuser' ---
  const newuserPage =
    await api.functional.erpHrm.member.organizations.invitations.index(
      ownerConnection,
      {
        organizationId,
        body: { email: "newuser" } satisfies IErpHrmInvitation.IRequest,
      },
    );
  typia.assert(newuserPage);
  TestValidator.equals(
    "email partial match 'newuser': records count",
    newuserPage.pagination.records,
    2,
  );
  for (const inv of newuserPage.data) {
    TestValidator.predicate(
      "email partial match: email contains 'newuser'",
      inv.email.includes("newuser"),
    );
  }
  // --- Test execution: Email no match ---
  const noMatchPage =
    await api.functional.erpHrm.member.organizations.invitations.index(
      ownerConnection,
      {
        organizationId,
        body: {
          email: "nonexistent@nowhere.com",
        } satisfies IErpHrmInvitation.IRequest,
      },
    );
  typia.assert(noMatchPage);
  TestValidator.equals(
    "email no match: records count",
    noMatchPage.pagination.records,
    0,
  );
  TestValidator.equals(
    "email no match: data is empty",
    noMatchPage.data.length,
    0,
  );
}
