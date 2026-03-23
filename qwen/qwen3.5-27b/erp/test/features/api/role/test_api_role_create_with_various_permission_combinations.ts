import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_hrm_platform_admin_roles_create } from "../../../generate/generate_random_hrm_platform_admin_roles_create";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";

/**
 * Test creating custom roles with different permission combinations to validate permission assignment logic.
 *
 * This test validates that custom roles can be created with various permission
 * combinations, from single permissions to all available permissions. It verifies
 * that permission arrays are correctly stored and retrieved, and that the role
 * creation workflow functions properly for different permission sets.
 */
export async function test_api_role_create_with_various_permission_combinations(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformAdmin.IJoin,
  });
  // 2. Create role with single permission
  const singlePermissionRole =
    await api.functional.hrmPlatform.admin.roles.create(adminConnection, {
      body: {
        name: RandomGenerator.alphabets(10),
        description: "Role with single permission",
        permissions: ["project_view"],
      } satisfies IHrmPlatformRole.ICreate,
    });
  typia.assert(singlePermissionRole);
  TestValidator.equals(
    "single permission count",
    singlePermissionRole.permissions.length,
    1,
  );
  TestValidator.equals(
    "single permission matches",
    singlePermissionRole.permissions[0],
    "project_view",
  );
  // 3. Create role with multiple permissions
  const multiplePermissionRole =
    await api.functional.hrmPlatform.admin.roles.create(adminConnection, {
      body: {
        name: RandomGenerator.alphabets(10),
        description: "Role with multiple permissions",
        permissions: [
          "employee_manage",
          "employee_view",
          "time_approve",
          "report_view",
        ],
      } satisfies IHrmPlatformRole.ICreate,
    });
  typia.assert(multiplePermissionRole);
  TestValidator.equals(
    "multiple permission count",
    multiplePermissionRole.permissions.length,
    4,
  );
  TestValidator.equals(
    "multiple permissions contain employee_manage",
    multiplePermissionRole.permissions.includes("employee_manage"),
    true,
  );
  TestValidator.equals(
    "multiple permissions contain employee_view",
    multiplePermissionRole.permissions.includes("employee_view"),
    true,
  );
  TestValidator.equals(
    "multiple permissions contain time_approve",
    multiplePermissionRole.permissions.includes("time_approve"),
    true,
  );
  TestValidator.equals(
    "multiple permissions contain report_view",
    multiplePermissionRole.permissions.includes("report_view"),
    true,
  );
  // 4. Create role with all available permissions
  const allPermissionsRole =
    await api.functional.hrmPlatform.admin.roles.create(adminConnection, {
      body: {
        name: RandomGenerator.alphabets(10),
        description: "Role with all permissions",
        permissions: [
          "org:manage",
          "employee:manage",
          "employee:view",
          "project:manage",
          "project:view",
          "time:manage",
          "time:approve",
          "time:view_all",
          "report:view",
        ],
      } satisfies IHrmPlatformRole.ICreate,
    });
  typia.assert(allPermissionsRole);
  TestValidator.equals(
    "all permissions count",
    allPermissionsRole.permissions.length,
    9,
  );
  TestValidator.equals(
    "all permissions contain org:manage",
    allPermissionsRole.permissions.includes("org:manage"),
    true,
  );
  TestValidator.equals(
    "all permissions contain employee:manage",
    allPermissionsRole.permissions.includes("employee:manage"),
    true,
  );
  TestValidator.equals(
    "all permissions contain employee:view",
    allPermissionsRole.permissions.includes("employee:view"),
    true,
  );
  TestValidator.equals(
    "all permissions contain project:manage",
    allPermissionsRole.permissions.includes("project:manage"),
    true,
  );
  TestValidator.equals(
    "all permissions contain project:view",
    allPermissionsRole.permissions.includes("project:view"),
    true,
  );
  TestValidator.equals(
    "all permissions contain time:manage",
    allPermissionsRole.permissions.includes("time:manage"),
    true,
  );
  TestValidator.equals(
    "all permissions contain time:approve",
    allPermissionsRole.permissions.includes("time:approve"),
    true,
  );
  TestValidator.equals(
    "all permissions contain time:view_all",
    allPermissionsRole.permissions.includes("time:view_all"),
    true,
  );
  TestValidator.equals(
    "all permissions contain report:view",
    allPermissionsRole.permissions.includes("report:view"),
    true,
  );
  // 5. Validate unique IDs for all roles
  TestValidator.notEquals(
    "role IDs are unique",
    singlePermissionRole.id,
    multiplePermissionRole.id,
  );
  TestValidator.notEquals(
    "role IDs are unique",
    singlePermissionRole.id,
    allPermissionsRole.id,
  );
  TestValidator.notEquals(
    "role IDs are unique",
    multiplePermissionRole.id,
    allPermissionsRole.id,
  );
  // 6. Validate that roles have proper timestamps
  TestValidator.predicate(
    "single role has created_at",
    singlePermissionRole.created_at !== null,
  );
  TestValidator.predicate(
    "multiple role has created_at",
    multiplePermissionRole.created_at !== null,
  );
  TestValidator.predicate(
    "all role has created_at",
    allPermissionsRole.created_at !== null,
  );
}
