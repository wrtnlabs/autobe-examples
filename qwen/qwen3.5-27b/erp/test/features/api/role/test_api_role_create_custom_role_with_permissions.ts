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
 * Test creating a custom role with specific permissions within an organization.
 *
 * This test validates the complete workflow of creating a new custom role:
 * 1. Authenticate as an admin with organization management permissions
 * 2. Create a custom role with a unique name, description, and permission set
 * 3. Verify the role is created correctly with all expected properties
 * 4. Validate that the role is marked as custom (not built-in)
 * 5. Confirm permissions are correctly associated with the role
 */
export async function test_api_role_create_custom_role_with_permissions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin with organization management permissions
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
  // 2. Create custom role with specific permissions
  const role = await generate_random_hrm_platform_admin_roles_create(
    adminConnection,
    {
      body: {
        name: "Senior Developer",
        description:
          "Senior development role with project management capabilities",
        permissions: [
          "project_manage",
          "project_view",
          "time_view",
          "report_view",
        ],
      },
    },
  );
  // 3. Validate response structure
  typia.assert(role);
  // 4. Validate business logic
  TestValidator.equals(
    "role name matches input",
    role.name,
    "Senior Developer",
  );
  TestValidator.equals(
    "role description matches input",
    role.description,
    "Senior development role with project management capabilities",
  );
  TestValidator.equals("role is marked as custom", role.is_builtin, false);
  TestValidator.equals(
    "built_in_type is null for custom roles",
    role.built_in_type,
    null,
  );
  TestValidator.equals("permissions match input", role.permissions, [
    "project_manage",
    "project_view",
    "time_view",
    "report_view",
  ]);
  TestValidator.predicate("has valid UUID", /^[0-9a-f-]{36}$/i.test(role.id));
  TestValidator.predicate(
    "has organization context",
    role.organization.id !== undefined,
  );
  TestValidator.predicate(
    "has created_at timestamp",
    role.created_at !== undefined,
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    role.updated_at !== undefined,
  );
}
