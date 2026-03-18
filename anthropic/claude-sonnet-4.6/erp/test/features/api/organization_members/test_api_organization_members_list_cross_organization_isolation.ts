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
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";

export async function test_api_organization_members_list_cross_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  // =========================================================
  // Step 1: Register Member A and create Organization A
  // =========================================================
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAAuth);
  const orgA = await generate_random_erp_hrm_member_organizations_create(
    memberAConnection,
    {},
  );
  typia.assert(orgA);
  // =========================================================
  // Step 2: Register Member B and create Organization B
  // =========================================================
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberBAuth);
  const orgB = await generate_random_erp_hrm_member_organizations_create(
    memberBConnection,
    {},
  );
  typia.assert(orgB);
  // =========================================================
  // Step 3: Cross-org access attempt (negative test)
  // Member B (scoped to Org B) tries to access Org A's member list
  // Expected: 403 Forbidden or 404 Not Found
  // =========================================================
  await TestValidator.httpError(
    "Member B must be rejected when accessing Org A member list",
    [403, 404],
    async () => {
      await api.functional.erpHrm.member.organizations.members.index(
        memberBConnection,
        {
          organizationId: orgA.id,
          body: {} satisfies IErpHrmOrganizationMember.IRequest,
        },
      );
    },
  );
  // =========================================================
  // Step 4: Correct organization access (positive test)
  // Member A (scoped to Org A) accesses Org A's member list
  // Expected: 200 OK, Member A is in the list, Member B is NOT
  // =========================================================
  const orgAMemberList =
    await api.functional.erpHrm.member.organizations.members.index(
      memberAConnection,
      {
        organizationId: orgA.id,
        body: {} satisfies IErpHrmOrganizationMember.IRequest,
      },
    );
  typia.assert(orgAMemberList);
  // Member A should appear in Org A's member list
  const memberAEmail = memberAAuth.email;
  const memberAInOrgA = orgAMemberList.data.some(
    (m) => m.member.email === memberAEmail,
  );
  TestValidator.predicate(
    "Member A must appear in Org A member list",
    memberAInOrgA,
  );
  // Member B must NOT appear in Org A's member list
  const memberBEmail = memberBAuth.email;
  const memberBInOrgA = orgAMemberList.data.some(
    (m) => m.member.email === memberBEmail,
  );
  TestValidator.predicate(
    "Member B must NOT appear in Org A member list",
    !memberBInOrgA,
  );
}
