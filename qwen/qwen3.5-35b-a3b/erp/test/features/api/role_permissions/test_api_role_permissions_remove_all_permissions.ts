import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformPermission";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
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
 * Test removing all permissions from a custom role, making it functionally inert.
 *
 * Validates that an organization owner can completely remove all permissions from a custom
 * role, resulting in a role that has no functional capabilities. The test verifies the
 * complete workflow: member registration with organization creation, custom role creation
 * with initial permissions, permission update to empty array, and final validation that
 * the role exists but has no permissions assigned.
 *
 * Special attention is given to verifying that the permissions array becomes empty after
 * the update operation, and that the role itself remains intact. According to business
 * rules, the system allows removing all permissions from a custom role, though this
 * effectively makes the role functionally inert - it cannot grant any capabilities to
 * employees assigned to it.
 *
 * 1. Member registers with organization creation (becomes Owner).
 * 2. Custom role is created with a unique name and description.
 * 3. Permissions are assigned to the custom role.
 * 4. All permissions are removed by submitting an empty array.
 * 5. Validates that the role's permissions array is empty.
 * 6. Confirms the role metadata remains intact (name, description, role_kind).
 */
export async function test_api_role_permissions_remove_all_permissions(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as member and create organization with Owner role
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(joinResult);
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: { ...connection.headers, Authorization: joinResult.token.access },
  };
  // Step 2: Create a custom role with initial permissions
  const role = await api.functional.hrmPlatform.member.roles.create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
        role_kind: "custom",
      } satisfies IHrmPlatformRole.ICreate,
    },
  );
  typia.assert(role);
  // Step 3: Assign several permissions to the custom role
  const initialPermissions = [
    "employee.view",
    "project.manage",
    "timesheet.approve",
  ];
  const roleWithPermissions =
    await api.functional.hrmPlatform.member.roles.permissions.update(
      memberConnection,
      {
        roleId: role.id,
        body: {
          permissions: initialPermissions,
        } satisfies IHrmPlatformRole.IUpdate,
      },
    );
  typia.assert(roleWithPermissions);
  // Step 4: Remove all permissions by submitting an empty array
  const roleWithoutPermissions =
    await api.functional.hrmPlatform.member.roles.permissions.update(
      memberConnection,
      {
        roleId: role.id,
        body: {
          permissions: [],
        } satisfies IHrmPlatformRole.IUpdate,
      },
    );
  typia.assert(roleWithoutPermissions);
  // Step 5: Verify the role now has an empty permissions array
  TestValidator.equals(
    "permissions array is empty",
    roleWithoutPermissions.permissions.length,
    0,
  );
  // Step 6: Verify role metadata remains intact
  TestValidator.equals(
    "role name unchanged",
    roleWithPermissions.name,
    roleWithoutPermissions.name,
  );
  TestValidator.equals(
    "role description unchanged",
    roleWithPermissions.description,
    roleWithoutPermissions.description,
  );
  TestValidator.equals(
    "role kind unchanged",
    roleWithPermissions.role_kind,
    roleWithoutPermissions.role_kind,
  );
  TestValidator.equals(
    "role id unchanged",
    roleWithPermissions.id,
    roleWithoutPermissions.id,
  );
}