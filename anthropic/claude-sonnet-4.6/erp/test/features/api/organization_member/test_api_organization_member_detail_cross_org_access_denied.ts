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

export async function test_api_organization_member_detail_cross_org_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Member A and create Organization A
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  const orgA = await generate_random_erp_hrm_member_organizations_create(
    memberAConnection,
    {},
  );
  typia.assert(orgA);
  // The owner.id of Org A is the OrganizationMember record of Member A in Org A
  const orgAMemberRecordId = orgA.owner.id;
  // 2. Register Member B and create Organization B
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  const orgB = await generate_random_erp_hrm_member_organizations_create(
    memberBConnection,
    {},
  );
  typia.assert(orgB);
  // 3. As Member B, attempt to access Org A's member record - should get 403
  await TestValidator.httpError(
    "cross-org access denied: member B cannot read member A's org member record",
    403,
    async () => {
      await api.functional.erpHrm.member.organizationMembers.at(
        memberBConnection,
        {
          organizationMemberId: orgAMemberRecordId,
        },
      );
    },
  );
}
