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

export async function test_api_organization_filtering_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Create Member A with their first organization (owned)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // Create additional organizations owned by Member A
  const ownedOrg1 = await generate_random_erp_hrm_member_organizations_create(
    memberAConnection,
    {},
  );
  typia.assert(ownedOrg1);
  const ownedOrg2 = await generate_random_erp_hrm_member_organizations_create(
    memberAConnection,
    {},
  );
  typia.assert(ownedOrg2);
  // Create Member B who will own organizations
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // Create organizations owned by Member B
  const otherOrg = await generate_random_erp_hrm_member_organizations_create(
    memberBConnection,
    {},
  );
  typia.assert(otherOrg);
  // Test 1: Filter with isOwner=true for Member A
  const ownedOrgs = await api.functional.erpHrm.member.organizations.index(
    memberAConnection,
    {
      body: { isOwner: true },
    },
  );
  typia.assert(ownedOrgs);
  // Validate: All returned organizations should have isOwner=true
  TestValidator.predicate(
    "isOwner=true returns owned organizations",
    ownedOrgs.data.length > 0,
  );
  for (const org of ownedOrgs.data) {
    TestValidator.equals("organization has isOwner=true", org.isOwner, true);
    TestValidator.equals("organization has owner role", org.role, "owner");
    TestValidator.equals(
      "organization owner matches member",
      org.owner.id,
      memberA.id,
    );
  }
  // Test 2: Filter with isOwner=false for Member A
  const nonOwnedOrgs = await api.functional.erpHrm.member.organizations.index(
    memberAConnection,
    {
      body: { isOwner: false },
    },
  );
  typia.assert(nonOwnedOrgs);
  // Validate: All returned organizations should have isOwner=false
  for (const org of nonOwnedOrgs.data) {
    TestValidator.equals("organization has isOwner=false", org.isOwner, false);
    TestValidator.predicate(
      "organization has non-owner role",
      org.role !== "owner",
    );
    TestValidator.notEquals(
      "organization owner does not match member",
      org.owner.id,
      memberA.id,
    );
  }
  // Test 3: Verify no overlap between owned and non-owned
  const ownedIds = new Set(ownedOrgs.data.map((o) => o.id));
  const nonOwnedIds = new Set(nonOwnedOrgs.data.map((o) => o.id));
  const overlap = [...ownedIds].filter((id) => nonOwnedIds.has(id));
  TestValidator.equals(
    "no overlap between owned and non-owned",
    overlap.length,
    0,
  );
  // Test 4: Total should equal sum of owned + non-owned
  const allOrgs = await api.functional.erpHrm.member.organizations.index(
    memberAConnection,
    {
      body: {},
    },
  );
  typia.assert(allOrgs);
  TestValidator.equals(
    "total count matches sum",
    allOrgs.data.length,
    ownedOrgs.data.length + nonOwnedOrgs.data.length,
  );
  // Test 5: Verify Member B's owned organizations
  const memberBOwnedOrgs =
    await api.functional.erpHrm.member.organizations.index(memberBConnection, {
      body: { isOwner: true },
    });
  typia.assert(memberBOwnedOrgs);
  TestValidator.predicate(
    "Member B has owned organizations",
    memberBOwnedOrgs.data.length >= 1,
  );
  for (const org of memberBOwnedOrgs.data) {
    TestValidator.equals("Member B's org has isOwner=true", org.isOwner, true);
    TestValidator.equals(
      "Member B's org owner matches",
      org.owner.id,
      memberB.id,
    );
  }
  // Test 6: Pagination with isOwner filter
  const paginatedOwned = await api.functional.erpHrm.member.organizations.index(
    memberAConnection,
    {
      body: {
        isOwner: true,
        page: 1,
        limit: 2,
      },
    },
  );
  typia.assert(paginatedOwned);
  TestValidator.predicate(
    "pagination returns correct page size",
    paginatedOwned.data.length <= 2,
  );
  for (const org of paginatedOwned.data) {
    TestValidator.equals("paginated org has isOwner=true", org.isOwner, true);
  }
  // Test 7: Combined filters (name search + isOwner)
  const orgName = ownedOrg1.name.substring(0, 5);
  const filteredByName = await api.functional.erpHrm.member.organizations.index(
    memberAConnection,
    {
      body: {
        isOwner: true,
        name: orgName,
      },
    },
  );
  typia.assert(filteredByName);
  for (const org of filteredByName.data) {
    TestValidator.equals("filtered org has isOwner=true", org.isOwner, true);
    TestValidator.predicate(
      "filtered org name matches search",
      org.name.toLowerCase().includes(orgName.toLowerCase()),
    );
  }
}
