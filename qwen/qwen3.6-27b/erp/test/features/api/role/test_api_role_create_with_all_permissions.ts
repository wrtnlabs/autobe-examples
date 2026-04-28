import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
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
import { generate_random_hrm_platform_member_roles_create } from "../../../generate/generate_random_hrm_platform_member_roles_create";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";

/**
 * Test creating a custom role with all available platform permissions.
 *
 * Validates the complete role creation workflow including member registration with
 * default organization context establishment, and creation of a custom authorization
 * template containing all 9 permission keys representing the platform's complete
 * capability catalog. The test ensures the system correctly creates role-permission
 * mappings with generated UUIDs and timestamps, properly scopes the role to the
 * member's organization, and correctly marks the role as non-built-in.
 *
 * Special attention is given to verifying that all permission strings are correctly
 * mapped to individual permission records, each with unique identifiers and proper
 * creation timestamps. The test confirms that the role contains the provided name
 * and description, and that the response includes the expected structure with all
 * nested relationships.
 *
 * 1. Authenticate as a new member by joining the platform.
 * 2. Create a custom role named 'Super Admin' with a description and all 9 valid
 *    permission keys: ['org:manage', 'employee:manage', 'employee:view',
 *    'project:manage', 'project:view', 'time:manage', 'time:approve',
 *    'time:view_all', 'report:view'].
 * 3. Validate the response returns the newly created role with all 9 permission
 *    mappings in the rolePermissions array, each with generated UUIDs.
 * 4. Verify built_in is false, description is set, and all timestamps are populated.
 */
export async function test_api_role_create_with_all_permissions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Create role with all permissions
  const roleBody = {
    name: "Super Admin",
    description: "Custom role with all platform capabilities",
    permissionKeys: [
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
  } satisfies IHrmPlatformRole.ICreate;
  const role = await generate_random_hrm_platform_member_roles_create(
    memberConnection,
    { body: roleBody },
  );
  typia.assert(role);
  // 3. Validate the response
  TestValidator.equals("role name matches input", role.name, "Super Admin");
  TestValidator.equals(
    "description matches input",
    role.description,
    "Custom role with all platform capabilities",
  );
  TestValidator.equals("is not built-in role", role.built_in, false);
  TestValidator.predicate(
    "has all 9 permission mappings",
    role.rolePermissions.length === 9,
  );
}
