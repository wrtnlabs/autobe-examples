import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_hrm_platform_admin_roles_create } from "../../../generate/generate_random_hrm_platform_admin_roles_create";
import { generate_random_hrm_platform_admin_roles_permissions_create } from "../../../generate/generate_random_hrm_platform_admin_roles_permissions_create";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";
import { prepare_random_hrm_platform_role_permission } from "../../../prepare/prepare_random_hrm_platform_role_permission";

/**
 * Test that duplicate permission assignments are prevented for the same role.
 *
 * 1. Admin joins and authenticates
 * 2. Creates a custom role with an initial permission
 * 3. Attempts to add the same permission again
 * 4. Validates that duplicate permission is prevented by error
 */
export async function test_api_role_permission_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Create a custom role with an initial permission
  const role = await generate_random_hrm_platform_admin_roles_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        permissions: ["project:view"],
      },
    },
  );
  typia.assert(role);
  // 3. Verify the role has exactly one permission
  TestValidator.equals("initial permission count", role.permissions.length, 1);
  TestValidator.equals(
    "initial permission",
    role.permissions[0],
    "project:view",
  );
  // 4. Attempt to add the same permission again (should throw error)
  await TestValidator.error("duplicate permission prevented", async () => {
    await generate_random_hrm_platform_admin_roles_permissions_create(
      adminConnection,
      {
        params: {
          roleId: role.id,
        },
        body: {
          permission_code: "project:view",
        },
      },
    );
  });
  // 5. Verify that adding a different permission works correctly
  const newPermission =
    await generate_random_hrm_platform_admin_roles_permissions_create(
      adminConnection,
      {
        params: {
          roleId: role.id,
        },
        body: {
          permission_code: "employee:view",
        },
      },
    );
  typia.assert(newPermission);
  TestValidator.equals(
    "new permission added successfully",
    newPermission.permission_code,
    "employee:view",
  );
  // 6. Verify the new permission is unique
  await TestValidator.error("another duplicate prevented", async () => {
    await generate_random_hrm_platform_admin_roles_permissions_create(
      adminConnection,
      {
        params: {
          roleId: role.id,
        },
        body: {
          permission_code: "employee:view",
        },
      },
    );
  });
}