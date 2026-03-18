import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_roles_create } from "../../../generate/generate_random_hrm_platform_member_roles_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";
import { prepare_random_hrm_platform_role_permission } from "../../../prepare/prepare_random_hrm_platform_role_permission";

/**
 * Test the primary success path for updating custom role permissions.
 *
 * This test verifies the complete workflow:
 * 1. Register a new member account (automatically authenticated)
 * 2. Create an organization (member becomes owner with full permissions)
 * 3. Create a custom role with initial permissions (employee:view, project:view)
 * 4. Update the role's permissions with a completely different set
 * 5. Validate the updated role contains only the new permissions
 * 6. Confirm old permissions were removed and new permissions were added
 */
export async function test_api_role_permission_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as member (becomes org owner)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create organization (member becomes owner with org:manage permission)
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create custom role with initial permissions
  const initialPermissions: IHrmPlatformRolePermission.ICreate[] = [
    { permission: "employee:view" },
    { permission: "project:view" },
  ];
  const role = await generate_random_hrm_platform_member_roles_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        permissions: initialPermissions,
      },
    },
  );
  typia.assert(role);
  TestValidator.predicate(
    "role is custom (not built-in)",
    () => !role.built_in,
  );
  TestValidator.equals("initial permission count", role.permissions.length, 2);
  // Verify initial permissions are correct
  const initialPermissionCodes = role.permissions.map((p) => p.permission);
  TestValidator.predicate("has employee:view initially", () =>
    initialPermissionCodes.includes("employee:view"),
  );
  TestValidator.predicate("has project:view initially", () =>
    initialPermissionCodes.includes("project:view"),
  );
  // 4. Update role permissions with different set (complete replacement)
  const newPermissions: string[] = [
    "org:manage",
    "employee:manage",
    "time:approve",
    "report:view",
  ];
  const updatedRole =
    await api.functional.hrmPlatform.member.roles.permissions.updatePermissions(
      memberConnection,
      {
        roleId: role.id,
        body: { permissions: newPermissions },
      },
    );
  typia.assert(updatedRole);
  // 5. Validate updated role structure
  TestValidator.equals("role id unchanged", updatedRole.id, role.id);
  TestValidator.equals("role name unchanged", updatedRole.name, role.name);
  TestValidator.predicate("still a custom role", () => !updatedRole.built_in);
  // 6. Validate new permissions are present
  TestValidator.equals(
    "updated permission count",
    updatedRole.permissions.length,
    4,
  );
  const updatedPermissionCodes = updatedRole.permissions.map(
    (p) => p.permission,
  );
  TestValidator.predicate("contains org:manage", () =>
    updatedPermissionCodes.includes("org:manage"),
  );
  TestValidator.predicate("contains employee:manage", () =>
    updatedPermissionCodes.includes("employee:manage"),
  );
  TestValidator.predicate("contains time:approve", () =>
    updatedPermissionCodes.includes("time:approve"),
  );
  TestValidator.predicate("contains report:view", () =>
    updatedPermissionCodes.includes("report:view"),
  );
  // 7. Validate old permissions were removed (complete replacement)
  TestValidator.predicate(
    "employee:view removed",
    () => !updatedPermissionCodes.includes("employee:view"),
  );
  TestValidator.predicate(
    "project:view removed",
    () => !updatedPermissionCodes.includes("project:view"),
  );
}
