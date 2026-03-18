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
import { generate_random_erp_hrm_member_organizations_roles_create } from "../../../generate/generate_random_erp_hrm_member_organizations_roles_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

export async function test_api_organization_member_self_profile_update_role_assignment(
  connection: api.IConnection,
): Promise<void> {
  // ── Step 1: Register first member and create first organization ──────────
  const member1Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member1Connection, {});
  const org1 = await generate_random_erp_hrm_member_organizations_create(
    member1Connection,
    {},
  );
  typia.assert(org1);
  // ── Step 2: Create a custom role in org-1 ───────────────────────────────
  const customRole1 =
    await generate_random_erp_hrm_member_organizations_roles_create(
      member1Connection,
      {
        body: {
          name: `custom-role-${RandomGenerator.alphaNumeric(8)}`,
          permissions: ["employee:view", "project:view"],
        },
        params: {
          organizationId: org1.id,
        },
      },
    );
  typia.assert(customRole1);
  // ── Step 3: Update own role to the custom role (success scenario) ────────
  const updatedMember =
    await api.functional.erpHrm.member.organizations.members.update(
      member1Connection,
      {
        organizationId: org1.id,
        body: {
          role_id: customRole1.id,
        } satisfies IErpHrmOrganizationMember.IUpdate,
      },
    );
  typia.assert(updatedMember);
  // Verify the role assignment
  TestValidator.equals(
    "role id matches custom role",
    updatedMember.role.id,
    customRole1.id,
  );
  TestValidator.equals(
    "role is not builtin",
    updatedMember.role.is_builtin,
    false,
  );
  // ── Step 4: Cross-organization role rejection ────────────────────────────
  // Register second member and create second organization
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2Connection, {});
  const org2 = await generate_random_erp_hrm_member_organizations_create(
    member2Connection,
    {},
  );
  typia.assert(org2);
  // Create a custom role in org-2
  const customRole2 =
    await generate_random_erp_hrm_member_organizations_roles_create(
      member2Connection,
      {
        body: {
          name: `custom-role-org2-${RandomGenerator.alphaNumeric(8)}`,
          permissions: ["employee:view"],
        },
        params: {
          organizationId: org2.id,
        },
      },
    );
  typia.assert(customRole2);
  // Attempt to use org-2's role in org-1's context — should fail
  await TestValidator.error(
    "cross-organization role reference must be rejected",
    async () => {
      await api.functional.erpHrm.member.organizations.members.update(
        member1Connection,
        {
          organizationId: org1.id,
          body: {
            role_id: customRole2.id,
          } satisfies IErpHrmOrganizationMember.IUpdate,
        },
      );
    },
  );
}
