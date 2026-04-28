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
import { generate_random_hrm_platform_member_roles_role_permissions_create } from "../../../generate/generate_random_hrm_platform_member_roles_role_permissions_create";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";
import { prepare_random_hrm_platform_role_permission } from "../../../prepare/prepare_random_hrm_platform_role_permission";

/**
 * Test successful retrieval of a specific role-permission mapping record.
 *
 * Validates the complete role-permission retrieval workflow: member authentication to establish organization context, custom role creation, permission granting to the role, and retrieval of the specific role-permission junction record. Ensures that the returned IHrmPlatformRolePermission object contains the correct permission_key, associated role summary with all required fields (id, name, builtIn, description, createdAt, updatedAt), and proper creation/update timestamps.
 *
 * Verifies organization-scoped data isolation by confirming the role-permission mapping is accessible only within the authenticated member's organization context.
 *
 * 1. Authenticate as a new member to establish organization context.
 * 2. Create a custom role within the organization.
 * 3. Grant a permission key ('employee:manage') to the custom role, creating the role-permission mapping.
 * 4. Retrieve the role-permission mapping using the valid roleId and rolePermissionId path parameters.
 * 5. Validate response returns complete IHrmPlatformRolePermission with matching permission_key and role summary.
 */
export async function test_api_role_permission_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member to establish organization context
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      href: "",
      referrer: "",
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuthorized);
  // 2. Create a custom role within the organization
  const customRole = await generate_random_hrm_platform_member_roles_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        permissionKeys: ["project:view"],
      },
    },
  );
  typia.assert(customRole);
  // 3. Grant a permission to the custom role
  const permissionKey = "employee:manage";
  const rolePermission =
    await generate_random_hrm_platform_member_roles_role_permissions_create(
      memberConnection,
      {
        params: { roleId: customRole.id },
        body: { permissionKey },
      },
    );
  typia.assert(rolePermission);
  // 4. Retrieve the role-permission mapping
  const retrieved =
    await api.functional.hrmPlatform.member.roles.role_permissions.at(
      memberConnection,
      {
        roleId: customRole.id,
        rolePermissionId: rolePermission.id,
      },
    );
  typia.assert(retrieved);
  // 5. Validate response
  TestValidator.equals(
    "role-permission id matches",
    retrieved.id,
    rolePermission.id,
  );
  TestValidator.equals(
    "permission key matches",
    retrieved.permission_key,
    permissionKey,
  );
  TestValidator.equals("role id matches", retrieved.role.id, customRole.id);
  TestValidator.predicate(
    "role is not built-in",
    retrieved.role.builtIn === false,
  );
  TestValidator.predicate(
    "has creation timestamp",
    retrieved.created_at !== undefined,
  );
  TestValidator.predicate(
    "has update timestamp",
    retrieved.updated_at !== undefined,
  );
}
