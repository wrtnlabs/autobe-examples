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
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_organizations_members_create } from "../../../generate/generate_random_erp_hrm_member_organizations_members_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";

export async function test_api_members_list_paginated_no_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first member (organization owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  // 2. Create a new organization (owner is automatically added as Owner-role member)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      ownerConnection,
      {},
    );
  typia.assert(organization);
  // 3. Register a second member and add them to the organization as full-time
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondAuthorized = await authorize_member_join(
    secondMemberConnection,
    {},
  );
  const secondOrgMember =
    await generate_random_erp_hrm_member_organizations_members_create(
      ownerConnection,
      {
        params: { organizationId: organization.id },
        body: {
          memberId: secondAuthorized.id,
          employmentType: "full-time",
        },
      },
    );
  typia.assert(secondOrgMember);
  // 4. Register a third member and add them to the organization as part-time
  const thirdMemberConnection: api.IConnection = { host: connection.host };
  const thirdAuthorized = await authorize_member_join(
    thirdMemberConnection,
    {},
  );
  const thirdOrgMember =
    await generate_random_erp_hrm_member_organizations_members_create(
      ownerConnection,
      {
        params: { organizationId: organization.id },
        body: {
          memberId: thirdAuthorized.id,
          employmentType: "part-time",
        },
      },
    );
  typia.assert(thirdOrgMember);
  // 5. Call PATCH /erpHrm/members with no filters using the owner connection
  const result = await api.functional.erpHrm.members.index(ownerConnection, {
    body: {} satisfies IErpHrmOrganizationMember.IRequest,
  });
  typia.assert(result);
  // 6. Validate pagination metadata
  TestValidator.predicate(
    "records is at least 3",
    result.pagination.records >= 3,
  );
  TestValidator.predicate(
    "data length is at most limit",
    result.data.length <= result.pagination.limit,
  );
  // 7. Verify default sort is by created_at descending (most recently added member appears first)
  if (result.data.length >= 2) {
    const firstCreatedAt = new Date(result.data[0]!.created_at).getTime();
    const secondCreatedAt = new Date(result.data[1]!.created_at).getTime();
    TestValidator.predicate(
      "default sort is created_at descending",
      firstCreatedAt >= secondCreatedAt,
    );
  }
}
