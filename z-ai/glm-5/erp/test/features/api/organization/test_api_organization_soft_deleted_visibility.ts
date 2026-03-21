import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";

export async function test_api_organization_soft_deleted_visibility(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account with authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  // 2. Create multiple organizations for the member
  const org1 = await generate_random_erp_hrm_member_organizations_create(
    memberConnection,
    {
      body: {
        name: `Active-Org-${RandomGenerator.alphaNumeric(8)}`,
        currency: "USD",
        timezone: "America/New_York",
        fiscalStartMonth: 1,
      },
    },
  );
  typia.assert(org1);
  const org2 = await generate_random_erp_hrm_member_organizations_create(
    memberConnection,
    {
      body: {
        name: `To-Delete-Org-${RandomGenerator.alphaNumeric(8)}`,
        currency: "EUR",
        timezone: "Europe/London",
        fiscalStartMonth: 4,
      },
    },
  );
  typia.assert(org2);
  // 3. Soft-delete one of the organizations
  await api.functional.erpHrm.member.organizations.erase(memberConnection, {
    organizationId: org2.id,
  });
  // 4. Call organization listing without includeDeleted flag (defaults to false)
  const activeOnlyResponse =
    await api.functional.erpHrm.member.organizations.index(memberConnection, {
      body: {} satisfies IErpHrmOrganization.IRequest,
    });
  typia.assert(activeOnlyResponse);
  // Verify: soft-deleted organization is NOT in the list
  const activeOrgIds = activeOnlyResponse.data.map((org) => org.id);
  TestValidator.predicate(
    "soft-deleted organization should not be in active-only list",
    !activeOrgIds.includes(org2.id),
  );
  // Verify: active organization IS in the list
  TestValidator.predicate(
    "active organization should be in active-only list",
    activeOrgIds.includes(org1.id),
  );
  // Verify: pagination reflects only active organizations
  TestValidator.equals(
    "pagination records should match active organization count",
    activeOnlyResponse.pagination.records,
    1,
  );
  // 5. Call organization listing with includeDeleted=true
  const allOrgsResponse =
    await api.functional.erpHrm.member.organizations.index(memberConnection, {
      body: {
        includeDeleted: true,
      } satisfies IErpHrmOrganization.IRequest,
    });
  typia.assert(allOrgsResponse);
  // Verify: both active and soft-deleted organizations are returned
  const allOrgIds = allOrgsResponse.data.map((org) => org.id);
  TestValidator.predicate(
    "soft-deleted organization should be in includeDeleted=true list",
    allOrgIds.includes(org2.id),
  );
  TestValidator.predicate(
    "active organization should be in includeDeleted=true list",
    allOrgIds.includes(org1.id),
  );
  // Verify: pagination reflects all organizations (including deleted)
  TestValidator.equals(
    "pagination records should include deleted organizations",
    allOrgsResponse.pagination.records,
    2,
  );
  // Verify: isOwner is correctly set for both organizations
  const activeOrgSummary = allOrgsResponse.data.find(
    (org) => org.id === org1.id,
  );
  const deletedOrgSummary = allOrgsResponse.data.find(
    (org) => org.id === org2.id,
  );
  TestValidator.equals(
    "active organization should have isOwner=true",
    activeOrgSummary?.isOwner,
    true,
  );
  TestValidator.equals(
    "deleted organization should have isOwner=true",
    deletedOrgSummary?.isOwner,
    true,
  );
  // Verify: role is correctly set for both organizations
  TestValidator.equals(
    "active organization should have owner role",
    activeOrgSummary?.role,
    "owner",
  );
  TestValidator.equals(
    "deleted organization should have owner role",
    deletedOrgSummary?.role,
    "owner",
  );
}
