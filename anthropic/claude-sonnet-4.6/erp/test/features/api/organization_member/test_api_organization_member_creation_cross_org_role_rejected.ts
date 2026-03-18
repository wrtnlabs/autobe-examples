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
import { generate_random_erp_hrm_member_organization_members_create } from "../../../generate/generate_random_erp_hrm_member_organization_members_create";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";

export async function test_api_organization_member_creation_cross_org_role_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register the primary member account (actor who will own both organizations)
  const primaryConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(primaryConnection, {});
  // 2. Create Organization A — primary org context
  const orgA = await generate_random_erp_hrm_member_organizations_create(
    primaryConnection,
    {},
  );
  typia.assert(orgA);
  // 3. Create Organization B — to obtain a cross-org role UUID
  //    After creation, the session context becomes Org B
  const orgB = await generate_random_erp_hrm_member_organizations_create(
    primaryConnection,
    {},
  );
  typia.assert(orgB);
  // Capture a role ID that belongs to Organization B (owner's role in Org B)
  const orgBRoleId = orgB.owner.role.id;
  // 4. Switch primary member's active context back to Organization A
  const switchedMember =
    await api.functional.erpHrm.member.organizations._switch.switchContext(
      primaryConnection,
      { organizationId: orgA.id },
    );
  typia.assert(switchedMember);
  // 5. Register a second platform-level member account
  //    This provides a valid memberId for the test request
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMemberAuth = await authorize_member_join(
    secondMemberConnection,
    {},
  );
  typia.assert(secondMemberAuth);
  const secondMemberId = secondMemberAuth.member.id;
  // 6. Attempt to create an organization member in Org A using a roleId from Org B
  //    This must be rejected because the role does not belong to Org A
  await TestValidator.error(
    "cross-org role reference must be rejected when creating organization member",
    async () => {
      await generate_random_erp_hrm_member_organization_members_create(
        primaryConnection,
        {
          body: {
            memberId: secondMemberId,
            roleId: orgBRoleId,
            employmentType: "intern",
          },
        },
      );
    },
  );
}
