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
import { generate_random_erp_hrm_member_organizations_roles_permissions_create } from "../../../generate/generate_random_erp_hrm_member_organizations_roles_permissions_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";
import { prepare_random_erp_hrm_role_permission } from "../../../prepare/prepare_random_erp_hrm_role_permission";

export async function test_api_role_permission_removal_denied_for_non_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register the first member (owner) and get their connection
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  // Step 2: Create an organization — owner connection is now authenticated
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      ownerConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: Create a custom role with broad permissions (including org:manage)
  const customRole =
    await generate_random_erp_hrm_member_organizations_roles_create(
      ownerConnection,
      {
        body: {
          name: "Manager Role " + RandomGenerator.alphabets(6),
          permissions: ["org:manage", "employee:manage", "employee:view"],
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(customRole);
  // Step 4: Add a permission (employee:view) to the custom role — capture permissionId
  const permission =
    await generate_random_erp_hrm_member_organizations_roles_permissions_create(
      ownerConnection,
      {
        body: {
          permission_code: "time:view_all",
        },
        params: {
          organizationId: organization.id,
          roleId: customRole.id,
        },
      },
    );
  typia.assert(permission);
  // Step 5: Register a second member (non-owner)
  const nonOwnerConnection: api.IConnection = { host: connection.host };
  const nonOwnerAuthorized = await authorize_member_join(
    nonOwnerConnection,
    {},
  );
  // Step 6: Add the second member to the organization with the custom role
  const orgMember =
    await generate_random_erp_hrm_member_organizations_members_create(
      ownerConnection,
      {
        body: {
          memberId: nonOwnerAuthorized.id,
          roleId: customRole.id,
          employmentType: "full-time",
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(orgMember);
  // Step 7: Non-owner attempts to delete the permission — must be denied with 403
  await TestValidator.httpError(
    "non-owner cannot remove role permission",
    403,
    async () => {
      await api.functional.erpHrm.member.organizations.roles.permissions.erase(
        nonOwnerConnection,
        {
          organizationId: organization.id,
          roleId: customRole.id,
          permissionId: permission.id,
        },
      );
    },
  );
}
