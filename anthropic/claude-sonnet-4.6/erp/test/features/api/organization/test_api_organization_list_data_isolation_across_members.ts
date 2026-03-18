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

export async function test_api_organization_list_data_isolation_across_members(
  connection: api.IConnection,
): Promise<void> {
  // ── Step 1: Register Member A ────────────────────────────────────────────
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  // ── Step 2: Create Organization 1 as Member A ────────────────────────────
  const org1 = await generate_random_erp_hrm_member_organizations_create(
    memberAConnection,
    {},
  );
  typia.assert(org1);
  // ── Step 3: Register Member B ────────────────────────────────────────────
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // ── Step 4: Create Organization 2 as Member B ────────────────────────────
  const org2 = await generate_random_erp_hrm_member_organizations_create(
    memberBConnection,
    {},
  );
  typia.assert(org2);
  // ── Step 5: Data isolation test — Member A's perspective ─────────────────
  const memberAListResult =
    await api.functional.erpHrm.member.organizations.index(memberAConnection, {
      body: {} satisfies IErpHrmOrganization.IRequest,
    });
  typia.assert(memberAListResult);
  // Organization 1 must be visible to Member A
  TestValidator.predicate(
    "Member A can see Organization 1 they created",
    memberAListResult.data.some((org) => org.id === org1.id),
  );
  // Organization 2 (created by Member B) must NOT be visible to Member A
  TestValidator.predicate(
    "Member A cannot see Organization 2 created by Member B",
    !memberAListResult.data.some((org) => org.id === org2.id),
  );
  // ── Step 6: Reciprocal isolation test — Member B's perspective ────────────
  const memberBListResult =
    await api.functional.erpHrm.member.organizations.index(memberBConnection, {
      body: {} satisfies IErpHrmOrganization.IRequest,
    });
  typia.assert(memberBListResult);
  // Organization 2 must be visible to Member B
  TestValidator.predicate(
    "Member B can see Organization 2 they created",
    memberBListResult.data.some((org) => org.id === org2.id),
  );
  // Organization 1 (created by Member A) must NOT be visible to Member B
  TestValidator.predicate(
    "Member B cannot see Organization 1 created by Member A",
    !memberBListResult.data.some((org) => org.id === org1.id),
  );
  // ── Step 7: Deleted organization exclusion test ───────────────────────────
  // Delete Organization 1 as Member A
  await api.functional.erpHrm.member.organizations.erase(memberAConnection, {
    organizationId: org1.id,
  });
  // Call index again as Member A after deletion
  const memberAListAfterDelete =
    await api.functional.erpHrm.member.organizations.index(memberAConnection, {
      body: {} satisfies IErpHrmOrganization.IRequest,
    });
  typia.assert(memberAListAfterDelete);
  // Deleted Organization 1 must NOT appear in results
  TestValidator.predicate(
    "Deleted Organization 1 does not appear in Member A's list",
    !memberAListAfterDelete.data.some((org) => org.id === org1.id),
  );
}
