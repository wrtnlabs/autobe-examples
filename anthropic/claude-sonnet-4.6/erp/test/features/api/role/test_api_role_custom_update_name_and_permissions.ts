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

export async function test_api_role_custom_update_name_and_permissions(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member and get authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Create an organization (the member automatically becomes Owner with org:manage)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: Create a custom role with initial name and permissions
  const initialRole =
    await generate_random_erp_hrm_member_organizations_roles_create(
      memberConnection,
      {
        body: {
          name: "Analyst",
          permissions: ["employee:view", "project:view"],
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(initialRole);
  // Step 4: Update the custom role with new name and a fully replaced permission set
  const updatedRole =
    await api.functional.erpHrm.member.organizations.roles.update(
      memberConnection,
      {
        organizationId: organization.id,
        roleId: initialRole.id,
        body: {
          name: "Senior Analyst",
          permissionCodes: [
            "employee:view",
            "project:view",
            "time:view_all",
            "report:view",
          ],
        } satisfies IErpHrmRole.IUpdate,
      },
    );
  typia.assert(updatedRole);
  // Step 5: Validate updated role properties
  // Name must be updated
  TestValidator.equals("role name updated", updatedRole.name, "Senior Analyst");
  // isBuiltin must still be false (custom role)
  TestValidator.equals("role is not builtin", updatedRole.isBuiltin, false);
  // updatedAt must be >= createdAt
  TestValidator.predicate(
    "updatedAt is not before createdAt",
    new Date(updatedRole.updatedAt) >= new Date(updatedRole.createdAt),
  );
  // Permissions must exactly match the new set (full replacement, not merge)
  const expectedPermissions = [
    "employee:view",
    "project:view",
    "time:view_all",
    "report:view",
  ];
  const actualPermissionCodes = updatedRole.permissions
    .map((p) => p.permission_code)
    .sort();
  const sortedExpected = [...expectedPermissions].sort();
  TestValidator.equals(
    "permissions fully replaced",
    actualPermissionCodes,
    sortedExpected,
  );
  // organizationId must match
  TestValidator.equals(
    "role belongs to correct organization",
    updatedRole.organizationId,
    organization.id,
  );
}
