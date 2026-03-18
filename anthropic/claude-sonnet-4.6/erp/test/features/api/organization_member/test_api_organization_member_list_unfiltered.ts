import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmOrganizationMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organization_members_create } from "../../../generate/generate_random_erp_hrm_member_organization_members_create";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";

export async function test_api_organization_member_list_unfiltered(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register owner member and establish authenticated connection
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuthorized = await authorize_member_join(ownerConnection, {});
  // ownerConnection now has the Authorization header set
  // 2. Create a new organization (owner is automatically added as org member)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      ownerConnection,
      {},
    );
  typia.assert(organization);
  // The owner is already a member of the organization.
  // Get the role id from the owner's organization member entry
  const ownerRoleId = organization.owner.role.id;
  // 3. Register additional platform members and add them to the organization
  // We'll add 3 additional members with different employment types
  const employmentTypes = ["full-time", "part-time", "contractor"] as const;
  const additionalMemberIds = await ArrayUtil.asyncMap(
    employmentTypes,
    async (employmentType) => {
      // Register a new platform member
      const memberConnection: api.IConnection = { host: connection.host };
      const authorized = await authorize_member_join(memberConnection, {});
      const newMemberId = authorized.id;
      // Add the new platform member to the organization
      const orgMember =
        await generate_random_erp_hrm_member_organization_members_create(
          ownerConnection,
          {
            body: {
              memberId: newMemberId,
              roleId: ownerRoleId,
              employmentType: employmentType,
            },
          },
        );
      typia.assert(orgMember);
      return newMemberId;
    },
  );
  // Total expected members: 1 (owner) + 3 (additional) = 4
  const expectedMemberCount = 1 + additionalMemberIds.length;
  // 4. Call PATCH /erpHrm/member/organizationMembers with no filters (empty body)
  const result = await api.functional.erpHrm.member.organizationMembers.index(
    ownerConnection,
    {
      body: {} satisfies IErpHrmOrganizationMember.IRequest,
    },
  );
  typia.assert(result);
  // 5. Validate pagination metadata
  TestValidator.equals("pagination current page", result.pagination.current, 1);
  TestValidator.equals("pagination limit", result.pagination.limit, 20);
  TestValidator.predicate("data is non-empty", result.data.length > 0);
  TestValidator.equals(
    "pagination records matches member count",
    result.pagination.records,
    expectedMemberCount,
  );
  // 6. Verify pages calculation is consistent
  TestValidator.equals(
    "pagination pages",
    result.pagination.pages,
    Math.ceil(result.pagination.records / result.pagination.limit),
  );
}
