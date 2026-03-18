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

export async function test_api_role_creation_with_permissions_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member and get authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a new organization (member becomes owner with org:manage permission)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create a custom role with specific permissions
  const roleName = "HR Specialist";
  const role = await generate_random_erp_hrm_member_organizations_roles_create(
    memberConnection,
    {
      params: { organizationId: organization.id },
      body: {
        name: roleName,
        permissions: ["employee:manage", "employee:view", "report:view"],
      },
    },
  );
  typia.assert(role);
  // 4. Validate the response
  TestValidator.equals(
    "organizationId matches",
    role.organizationId,
    organization.id,
  );
  TestValidator.equals("role name matches", role.name, roleName);
  TestValidator.equals("isBuiltin is false", role.isBuiltin, false);
  TestValidator.equals("permissions count", role.permissions.length, 3);
  // Validate that the permission codes are present
  const permissionCodes = role.permissions.map((p) => p.permission_code);
  TestValidator.predicate(
    "contains employee:manage",
    permissionCodes.includes("employee:manage"),
  );
  TestValidator.predicate(
    "contains employee:view",
    permissionCodes.includes("employee:view"),
  );
  TestValidator.predicate(
    "contains report:view",
    permissionCodes.includes("report:view"),
  );
  // 5. Test deduplication: supply duplicate permission codes
  const deduplicatedRoleName = "Dedup Role";
  const dedupRole =
    await generate_random_erp_hrm_member_organizations_roles_create(
      memberConnection,
      {
        params: { organizationId: organization.id },
        body: {
          name: deduplicatedRoleName,
          permissions: ["employee:manage", "employee:manage", "report:view"],
        },
      },
    );
  typia.assert(dedupRole);
  // Verify only 2 distinct entries in permissions (deduplication occurred)
  TestValidator.equals(
    "deduplicated permissions count",
    dedupRole.permissions.length,
    2,
  );
  const dedupPermissionCodes = dedupRole.permissions.map(
    (p) => p.permission_code,
  );
  TestValidator.predicate(
    "dedup contains employee:manage",
    dedupPermissionCodes.includes("employee:manage"),
  );
  TestValidator.predicate(
    "dedup contains report:view",
    dedupPermissionCodes.includes("report:view"),
  );
}
