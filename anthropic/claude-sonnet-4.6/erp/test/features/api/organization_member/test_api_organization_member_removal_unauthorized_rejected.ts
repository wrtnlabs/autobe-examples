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

export async function test_api_organization_member_removal_unauthorized_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register the Owner and create an owner-specific connection
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuthorized = await authorize_member_join(ownerConnection, {});
  typia.assert(ownerAuthorized);
  // Step 2: Owner creates an organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      ownerConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: Register the third member (Target) who will be added to the org
  const targetConnection: api.IConnection = { host: connection.host };
  const targetAuthorized = await authorize_member_join(targetConnection, {});
  typia.assert(targetAuthorized);
  // Step 4: Owner adds the Target to the organization using the Owner's known role ID
  const targetOrgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      ownerConnection,
      {
        body: {
          memberId: targetAuthorized.member.id,
          roleId: organization.owner.role.id,
          employmentType: "full-time",
        },
      },
    );
  typia.assert(targetOrgMember);
  // Step 5: Register the Actor (second member) who is NOT added to the organization
  const actorConnection: api.IConnection = { host: connection.host };
  const actorAuthorized = await authorize_member_join(actorConnection, {});
  typia.assert(actorAuthorized);
  // Step 6: Actor (with no org membership / no org:manage permission) attempts
  // to delete the Target's organization member record — must be rejected with 403
  await TestValidator.httpError(
    "unauthorized member cannot remove organization member",
    403,
    async () => {
      await api.functional.erpHrm.member.organizationMembers.erase(
        actorConnection,
        {
          organizationMemberId: targetOrgMember.id,
        },
      );
    },
  );
}
