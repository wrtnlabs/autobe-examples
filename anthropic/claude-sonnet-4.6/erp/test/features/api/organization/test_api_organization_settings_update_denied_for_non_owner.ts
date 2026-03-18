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

export async function test_api_organization_settings_update_denied_for_non_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register Member 1 (the owner) and create a dedicated connection
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {});
  typia.assert(member1Auth);
  // Step 2: Create a new organization (Member 1 automatically becomes the Owner)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      member1Connection,
      {},
    );
  typia.assert(organization);
  // Step 3: Register Member 2 (a non-owner) with a different email
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {});
  typia.assert(member2Auth);
  // Step 4: As Member 1 (owner), add Member 2 to the organization
  // Use the Owner role ID from the organization (only role ID available without list endpoint)
  // The platform's 403 enforcement is based on owner_member_id, not just role assignment
  const orgMember2 =
    await generate_random_erp_hrm_member_organization_members_create(
      member1Connection,
      {
        body: {
          memberId: member2Auth.id,
          roleId: organization.owner.role.id,
          employmentType: "full-time",
        },
      },
    );
  typia.assert(orgMember2);
  // Step 5: Switch Member 2's active organization context to the target organization
  const member2SwitchedContext =
    await api.functional.erpHrm.member.organizations._switch.switchContext(
      member2Connection,
      {
        organizationId: organization.id,
      },
    );
  typia.assert(member2SwitchedContext);
  // Test execution: Attempt to update organization settings as Member 2 (non-owner)
  // Expected: 403 Forbidden — only the Owner (owner_member_id) is authorized
  await TestValidator.httpError(
    "non-owner member cannot update organization settings",
    403,
    async () => {
      await api.functional.erpHrm.member.organizations.update(
        member2Connection,
        {
          organizationId: organization.id,
          body: {
            description: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IErpHrmOrganization.IUpdate,
        },
      );
    },
  );
}
