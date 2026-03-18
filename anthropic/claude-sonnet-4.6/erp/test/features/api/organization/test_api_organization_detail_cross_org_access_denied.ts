import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
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

export async function test_api_organization_detail_cross_org_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // -----------------------------------------------------------------------
  // Step 1: Register Member A and create Organization A
  // -----------------------------------------------------------------------
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  const organizationA =
    await generate_random_erp_hrm_member_organizations_create(
      memberAConnection,
      {},
    );
  typia.assert(organizationA);
  // -----------------------------------------------------------------------
  // Step 2: Register Member B and create Organization B
  // -----------------------------------------------------------------------
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  const organizationB =
    await generate_random_erp_hrm_member_organizations_create(
      memberBConnection,
      {},
    );
  typia.assert(organizationB);
  // -----------------------------------------------------------------------
  // Step 3: Cross-org access test
  // Member A (active context = Organization A) tries to access Organization B
  // Expect 403 Forbidden
  // -----------------------------------------------------------------------
  await TestValidator.httpError(
    "member A cannot access Organization B (cross-org isolation)",
    403,
    async () => {
      await api.functional.erpHrm.member.organizations.at(memberAConnection, {
        organizationId: organizationB.id,
      });
    },
  );
  // -----------------------------------------------------------------------
  // Step 4: Control test
  // Member A (active context = Organization A) accesses Organization A
  // Expect 200 OK
  // -----------------------------------------------------------------------
  const organizationADetail =
    await api.functional.erpHrm.member.organizations.at(memberAConnection, {
      organizationId: organizationA.id,
    });
  typia.assert(organizationADetail);
  TestValidator.equals(
    "Organization A detail id matches",
    organizationADetail.id,
    organizationA.id,
  );
}
