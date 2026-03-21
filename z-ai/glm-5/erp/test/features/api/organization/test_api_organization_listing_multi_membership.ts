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

export async function test_api_organization_listing_multi_membership(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a member account using utility function
  // This automatically creates the member's first organization as owner
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // Step 2: Create additional organizations (member is already owner of first org from join)
  const createdOrganizations: IErpHrmOrganization[] = [];
  // Create 2 more organizations (total: 3 organizations, all owned by this member)
  for (let i = 0; i < 2; i++) {
    const org = await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
    typia.assert(org);
    createdOrganizations.push(org);
  }
  // Step 3: Call organization listing endpoint with no filters
  const response = await api.functional.erpHrm.member.organizations.index(
    memberConnection,
    { body: {} },
  );
  typia.assert(response);
  // Step 4: Validate pagination data accuracy
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit > 0,
  );
  TestValidator.equals(
    "pagination records",
    response.pagination.records,
    response.data.length,
  );
  TestValidator.equals(
    "pagination pages calculation",
    response.pagination.pages,
    Math.ceil(response.pagination.records / response.pagination.limit),
  );
  // Step 5: Validate all created organizations appear in response
  TestValidator.predicate(
    "at least 3 organizations returned",
    response.data.length >= 3,
  );
  const responseOrgIds = new Set(response.data.map((org) => org.id));
  for (const createdOrg of createdOrganizations) {
    TestValidator.predicate(
      `created organization ${createdOrg.id} is in response`,
      responseOrgIds.has(createdOrg.id),
    );
  }
  // Step 6: Validate role and isOwner for all organizations
  // Member is owner of all organizations they created
  for (const org of response.data) {
    TestValidator.equals("role is owner", org.role, "owner");
    TestValidator.equals("isOwner is true", org.isOwner, true);
  }
  // Step 7: Validate sorting by created_at descending (most recent first)
  const createdAts = response.data.map((org) =>
    new Date(org.createdAt).getTime(),
  );
  for (let i = 1; i < createdAts.length; i++) {
    TestValidator.predicate(
      "sorted by created_at descending",
      createdAts[i - 1] >= createdAts[i],
    );
  }
}
