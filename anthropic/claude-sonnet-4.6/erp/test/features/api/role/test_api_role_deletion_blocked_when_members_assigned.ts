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
import { generate_random_erp_hrm_member_organizations_members_create } from "../../../generate/generate_random_erp_hrm_member_organizations_members_create";
import { generate_random_erp_hrm_member_organizations_roles_create } from "../../../generate/generate_random_erp_hrm_member_organizations_roles_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

export async function test_api_role_deletion_blocked_when_members_assigned(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register owner member
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuthorized = await authorize_member_join(ownerConnection, {});
  typia.assert(ownerAuthorized);
  // 2. Create organization (owner becomes the org owner)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      ownerConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create a custom role within the organization
  const customRole =
    await generate_random_erp_hrm_member_organizations_roles_create(
      ownerConnection,
      {
        params: { organizationId: organization.id },
        body: {
          permissions: ["employee:view"],
        },
      },
    );
  typia.assert(customRole);
  // 4. Register a second member (separate connection, separate account)
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMemberAuthorized = await authorize_member_join(
    secondMemberConnection,
    {},
  );
  typia.assert(secondMemberAuthorized);
  // 5. Add second member to the organization with the custom role assigned
  const orgMember =
    await generate_random_erp_hrm_member_organizations_members_create(
      ownerConnection,
      {
        params: { organizationId: organization.id },
        body: {
          memberId: secondMemberAuthorized.member.id,
          roleId: customRole.id,
          employmentType: "full-time",
        },
      },
    );
  typia.assert(orgMember);
  // 6. Attempt to delete the custom role as the owner
  // Should fail with 409 Conflict because the second member is assigned to this role
  await TestValidator.httpError(
    "role deletion blocked when members are assigned",
    409,
    async () => {
      await api.functional.erpHrm.member.organizations.roles.erase(
        ownerConnection,
        {
          organizationId: organization.id,
          roleId: customRole.id,
        },
      );
    },
  );
}
