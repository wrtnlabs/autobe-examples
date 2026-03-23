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
 * Test the primary success path for updating a custom role.
 * 1. Authenticate as admin with organization management permissions
 * 2. Create a custom role with initial permissions
 * 3. Update the role with new name, description, and different permission set
 * 4. Verify the response contains the updated role with all fields
 * 5. Verify the permissions array reflects the new permission codes
 * 6. Verify the updated_at timestamp is recent
 * 7. Verify the role remains associated with the correct organization
 */
export async function test_api_role_update_custom_role_success(
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
  // 2. Create a custom role with initial permissions
  const initialRole = await generate_random_hrm_platform_admin_roles_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        permissions: ["employee_view", "project_view"],
      } satisfies IHrmPlatformRole.ICreate,
    },
  );
  typia.assert(initialRole);
  // Store initial values for comparison
  const initialName = initialRole.name;
  const initialPermissions = initialRole.permissions;
  // 3. Update the role with new name, description, and different permissions
  const updatedRole = await api.functional.hrmPlatform.admin.roles.update(
    adminConnection,
    {
      roleId: initialRole.id,
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 4 }),
        permissions: ["employee_manage", "project_manage", "time_view"],
      } satisfies IHrmPlatformRole.IUpdate,
    },
  );
  typia.assert(updatedRole);
  // 4. Verify the response contains the updated role with all fields
  TestValidator.equals("role id unchanged", updatedRole.id, initialRole.id);
  // 5. Verify the permissions array reflects the new permission codes
  TestValidator.equals(
    "permissions updated to new set",
    updatedRole.permissions,
    ["employee_manage", "project_manage", "time_view"],
  );
  // 6. Verify the updated_at timestamp is recent (after initial creation)
  TestValidator.predicate(
    "updated_at is after created_at",
    new Date(updatedRole.updated_at) > new Date(updatedRole.created_at),
  );
  // 7. Verify the role remains associated with the correct organization
  TestValidator.equals(
    "organization id unchanged",
    updatedRole.organization.id,
    initialRole.organization.id,
  );
  // Additional validation: name should be different from initial
  TestValidator.notEquals(
    "role name has been updated",
    updatedRole.name,
    initialName,
  );
  // Verify permissions are different from initial
  TestValidator.notEquals(
    "permissions have been changed",
    updatedRole.permissions,
    initialPermissions,
  );
}
