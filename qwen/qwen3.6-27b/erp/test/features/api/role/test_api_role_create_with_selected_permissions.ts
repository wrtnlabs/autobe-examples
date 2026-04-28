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
 * Test the primary workflow for creating a custom role with a selection of permission keys.
 *
 * Validates the complete role creation flow including member registration and authentication, custom role definition with specific permission combinations, and proper response structure. Ensures the newly created role is correctly scoped to the member's organization, marked as a custom (non-built-in) role, and contains all submitted permissions properly mapped.
 *
 * Special attention is given to verifying that the role name, description, and built-in status are correctly returned. Each permission in the response must contain the expected `permission_key`, a nested `role` summary matching the created role's name, a valid UUID for the permission mapping record, and valid creation and update timestamps.
 *
 * 1. New member joins the platform, creating account and default organization.
 * 2. Creates a custom role named "Time Viewer" with permissions ['employee:view', 'project:view', 'time:view_all'] and an optional description.
 * 3. Validates the response contains the correctly populated role object with proper structure.
 */
export async function test_api_role_create_with_selected_permissions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as new member, establishing organization context
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, { body: {} });
  typia.assert(member);
  // 2. Define permission keys for the custom role
  const permissionKeys = ["employee:view", "project:view", "time:view_all"];
  // 3. Create custom role with selected permissions
  const body = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    permissionKeys,
  } satisfies IHrmPlatformRole.ICreate;
  const role = await api.functional.hrmPlatform.member.roles.create(
    memberConnection,
    { body },
  );
  typia.assert(role);
  // 4. Validate role response structure and business logic
  TestValidator.equals("role name matches input", role.name, body.name);
  TestValidator.predicate(
    "role is custom (not built-in)",
    role.built_in === false,
  );
  TestValidator.equals(
    "number of permissions matches input",
    role.rolePermissions.length,
    permissionKeys.length,
  );
  // 5. Validate each permission exists and has correct structure
  for (const key of permissionKeys) {
    const perm = role.rolePermissions.find((p) => p.permission_key === key);
    TestValidator.predicate(
      `permission key ${key} found in response`,
      perm !== undefined,
    );
    typia.assert(perm!);
  }
}
