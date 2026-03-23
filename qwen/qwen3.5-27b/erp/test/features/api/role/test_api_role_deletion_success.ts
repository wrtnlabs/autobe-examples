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
 * Test successful deletion of a custom role with no employees assigned.
 *
 * This test validates the primary success path for role deletion:
 * 1. Admin authenticates to the system
 * 2. Admin creates a custom role with specific permissions
 * 3. Admin deletes the custom role (no employees assigned)
 * 4. Verify the deletion completes successfully with 204 No Content
 */
export async function test_api_role_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
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
  // 2. Create a custom role with minimal permissions
  const role: IHrmPlatformRole =
    await generate_random_hrm_platform_admin_roles_create(adminConnection, {
      body: {
        name: RandomGenerator.name(),
        description: "Test role for deletion",
        permissions: ["employee_view"],
      },
    });
  typia.assert(role);
  // Validate the created role properties
  TestValidator.predicate(
    "role is custom (not builtin)",
    role.is_builtin === false,
  );
  TestValidator.predicate("role has permissions", role.permissions.length > 0);
  // 3. Delete the custom role
  // This should succeed because:
  // - The role is custom (is_builtin = false)
  // - No employees are assigned to this role
  await api.functional.hrmPlatform.admin.roles.erase(adminConnection, {
    roleId: role.id,
  });
  // 4. Deletion success is verified by the absence of thrown exceptions
  // The erase function returns void, indicating 204 No Content response
}
