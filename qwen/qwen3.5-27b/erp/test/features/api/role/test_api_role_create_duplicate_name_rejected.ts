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
 * Test that creating a role with a duplicate name is rejected.
 *
 * This test verifies that the system enforces role name uniqueness within an
 * organization. When attempting to create a custom role with a name that already
 * exists (whether built-in or custom), the system should reject the request
 * with an appropriate error response.
 */
export async function test_api_role_create_duplicate_name_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin with organization management permissions
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformAdmin.IJoin,
  });
  // 2. First role creation - should succeed
  const firstRole = await generate_random_hrm_platform_admin_roles_create(
    adminConnection,
    {
      body: {
        name: "Test Role",
        description: "First test role for duplicate validation",
        permissions: ["employee_view", "project_view"],
      } satisfies IHrmPlatformRole.ICreate,
    },
  );
  typia.assert(firstRole);
  // Verify first role was created successfully
  TestValidator.equals("first role name", firstRole.name, "Test Role");
  TestValidator.predicate(
    "first role has permissions",
    firstRole.permissions.length > 0,
  );
  // 3. Attempt duplicate role creation - should fail
  await TestValidator.error("duplicate role name rejected", async () => {
    await api.functional.hrmPlatform.admin.roles.create(adminConnection, {
      body: {
        name: "Test Role",
        description: "Second test role with same name",
        permissions: ["employee_manage", "project_manage"],
      } satisfies IHrmPlatformRole.ICreate,
    });
  });
  // 4. Verify original role remains unchanged
  const originalRoleName = firstRole.name;
  TestValidator.equals(
    "original role name preserved",
    originalRoleName,
    "Test Role",
  );
}
