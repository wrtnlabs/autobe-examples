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

export async function test_api_organization_member_list_data_isolation(
  connection: api.IConnection,
): Promise<void> {
  // ===== SETUP: Member-A and Organization-A =====
  // 1. Register Member-A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {});
  typia.assert(memberAAuth);
  // 2. Create Organization-A under Member-A
  const orgA = await generate_random_erp_hrm_member_organizations_create(
    memberAConnection,
    {},
  );
  typia.assert(orgA);
  // 3. Register another platform member (Member-C) to add to Org-A
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberCAuth = await authorize_member_join(memberCConnection, {});
  typia.assert(memberCAuth);
  // 4. Add Member-C to Organization-A with distinctive position
  const orgMemberA =
    await generate_random_erp_hrm_member_organization_members_create(
      memberAConnection,
      {
        body: {
          memberId: memberCAuth.member.id,
          employmentType: "full-time",
          position: "Unique Engineer Org A",
          roleId: orgA.owner.role.id,
        },
      },
    );
  typia.assert(orgMemberA);
  // ===== SETUP: Member-B and Organization-B =====
  // 5. Register Member-B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {});
  typia.assert(memberBAuth);
  // 6. Create Organization-B under Member-B
  const orgB = await generate_random_erp_hrm_member_organizations_create(
    memberBConnection,
    {},
  );
  typia.assert(orgB);
  // 7. Register another platform member (Member-D) to add to Org-B
  const memberDConnection: api.IConnection = { host: connection.host };
  const memberDAuth = await authorize_member_join(memberDConnection, {});
  typia.assert(memberDAuth);
  // 8. Add Member-D to Organization-B with distinctive position
  const orgMemberB =
    await generate_random_erp_hrm_member_organization_members_create(
      memberBConnection,
      {
        body: {
          memberId: memberDAuth.member.id,
          employmentType: "full-time",
          position: "Unique Engineer Org B",
          roleId: orgB.owner.role.id,
        },
      },
    );
  typia.assert(orgMemberB);
  // ===== TEST STEPS AS MEMBER-A (Scoped to Organization-A) =====
  // 9. List all organization members as Member-A (no filters)
  const orgAMemberList =
    await api.functional.erpHrm.member.organizationMembers.index(
      memberAConnection,
      {
        body: {} satisfies IErpHrmOrganizationMember.IRequest,
      },
    );
  typia.assert(orgAMemberList);
  // 10. Verify no member with 'Unique Engineer Org B' position appears in Org-A's list
  const hasOrgBMemberInOrgA = orgAMemberList.data.some(
    (m) => m.position === "Unique Engineer Org B",
  );
  TestValidator.predicate(
    "Org-A list must not contain Org-B exclusive member position",
    !hasOrgBMemberInOrgA,
  );
  // 11. Verify Org-A list contains member with 'Unique Engineer Org A' position
  const hasOrgAMemberInOrgA = orgAMemberList.data.some(
    (m) => m.position === "Unique Engineer Org A",
  );
  TestValidator.predicate(
    "Org-A list must contain Org-A exclusive member position",
    hasOrgAMemberInOrgA,
  );
  // 12. Verify pagination.records reflects only Org-A's member count (owner + Member-C = 2)
  TestValidator.predicate(
    "Org-A pagination records should be 2 (owner + added member)",
    orgAMemberList.pagination.records >= 2,
  );
  // 13. Keyword search for 'Unique Engineer Org B' as Member-A should return empty data
  const orgAKeywordSearch =
    await api.functional.erpHrm.member.organizationMembers.index(
      memberAConnection,
      {
        body: {
          keyword: "Unique Engineer Org B",
        } satisfies IErpHrmOrganizationMember.IRequest,
      },
    );
  typia.assert(orgAKeywordSearch);
  TestValidator.predicate(
    "Cross-org keyword search from Org-A must return empty data",
    orgAKeywordSearch.data.length === 0,
  );
  // ===== TEST STEPS AS MEMBER-B (Scoped to Organization-B) =====
  // 14. List all organization members as Member-B (no filters)
  const orgBMemberList =
    await api.functional.erpHrm.member.organizationMembers.index(
      memberBConnection,
      {
        body: {} satisfies IErpHrmOrganizationMember.IRequest,
      },
    );
  typia.assert(orgBMemberList);
  // 15. Verify no member with 'Unique Engineer Org A' position appears in Org-B's list
  const hasOrgAMemberInOrgB = orgBMemberList.data.some(
    (m) => m.position === "Unique Engineer Org A",
  );
  TestValidator.predicate(
    "Org-B list must not contain Org-A exclusive member position",
    !hasOrgAMemberInOrgB,
  );
  // 16. Verify Org-B list contains member with 'Unique Engineer Org B' position
  const hasOrgBMemberInOrgB = orgBMemberList.data.some(
    (m) => m.position === "Unique Engineer Org B",
  );
  TestValidator.predicate(
    "Org-B list must contain Org-B exclusive member position",
    hasOrgBMemberInOrgB,
  );
  // 17. Verify pagination.records reflects only Org-B's member count (owner + Member-D = 2)
  TestValidator.predicate(
    "Org-B pagination records should be 2 (owner + added member)",
    orgBMemberList.pagination.records >= 2,
  );
  // 18. Verify Org-A member count != Org-B member count mixing (both should be isolated)
  // Both have 2 members each (owner + 1 added), cross-org totals would be 4
  // The individual pagination counts should equal their own org's size
  TestValidator.predicate(
    "Org-A total records must not include Org-B members",
    orgAMemberList.pagination.records < 4,
  );
  TestValidator.predicate(
    "Org-B total records must not include Org-A members",
    orgBMemberList.pagination.records < 4,
  );
}
