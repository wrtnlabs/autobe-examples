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

export async function test_api_invitation_list_paginated_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member (Owner) and get authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create a new organization (member automatically becomes Owner with employee:manage)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  const organizationId = organization.id;
  const ownerMemberId = organization.owner.id;
  // 3. Issue 3 invitations to distinct non-registered email addresses
  const invitationEmails = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"email">>(),
  );
  const createdInvitations = await ArrayUtil.asyncMap(
    invitationEmails,
    async (email) => {
      const invitation =
        await generate_random_erp_hrm_member_organizations_invitations_create(
          memberConnection,
          {
            body: { email },
            params: { organizationId },
          },
        );
      typia.assert(invitation);
      return invitation;
    },
  );
  // Ensure all 3 invitations were created successfully
  TestValidator.equals(
    "created invitations count",
    createdInvitations.length,
    3,
  );
  // 4. List all invitations with empty body (no filters)
  const allInvitations =
    await api.functional.erpHrm.member.organizations.invitations.index(
      memberConnection,
      {
        organizationId,
        body: {} satisfies IErpHrmInvitation.IRequest,
      },
    );
  typia.assert(allInvitations);
  // Validate pagination metadata
  TestValidator.equals(
    "total records equals 3",
    allInvitations.pagination.records,
    3,
  );
  TestValidator.equals(
    "current page is 1",
    allInvitations.pagination.current,
    1,
  );
  TestValidator.equals("total pages is 1", allInvitations.pagination.pages, 1);
  TestValidator.equals("data length is 3", allInvitations.data.length, 3);
  // Validate each invitation in the list
  for (const inv of allInvitations.data) {
    TestValidator.equals("status is pending", inv.status, "pending");
    TestValidator.predicate(
      "email matches one of created emails",
      invitationEmails.includes(inv.email),
    );
    TestValidator.equals("memberId is null", inv.memberId, null);
    TestValidator.equals(
      "invitingMember is the owner",
      inv.invitingMember.id,
      ownerMemberId,
    );
  }
  // 5. Pagination test: page=1, limit=2
  const page1Result =
    await api.functional.erpHrm.member.organizations.invitations.index(
      memberConnection,
      {
        organizationId,
        body: { page: 1, limit: 2 } satisfies IErpHrmInvitation.IRequest,
      },
    );
  typia.assert(page1Result);
  TestValidator.equals(
    "page1 total pages is 2",
    page1Result.pagination.pages,
    2,
  );
  TestValidator.equals("page1 data length is 2", page1Result.data.length, 2);
  TestValidator.equals(
    "page1 records is still 3",
    page1Result.pagination.records,
    3,
  );
  // 6. Pagination test: page=2, limit=2
  const page2Result =
    await api.functional.erpHrm.member.organizations.invitations.index(
      memberConnection,
      {
        organizationId,
        body: { page: 2, limit: 2 } satisfies IErpHrmInvitation.IRequest,
      },
    );
  typia.assert(page2Result);
  TestValidator.equals("page2 data length is 1", page2Result.data.length, 1);
  TestValidator.equals(
    "page2 records is still 3",
    page2Result.pagination.records,
    3,
  );
}
