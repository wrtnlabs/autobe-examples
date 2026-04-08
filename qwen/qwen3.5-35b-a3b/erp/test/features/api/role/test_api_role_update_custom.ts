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
 * Test custom role update functionality with permission replacement validation.
 *
 * Validates the complete custom role update workflow including member registration,
 * custom role creation, and comprehensive role attribute modification. Ensures that
 * the role update operation correctly replaces all permissions in replace mode and
 * maintains the custom role classification.
 *
 * Special attention is given to verifying that the permissions array is completely
 * replaced rather than merged, and that the role_kind remains 'custom' throughout
 * the operation lifecycle.
 *
 * 1. Member registration and authentication with organization setup.
 * 2. Custom role creation with initial name and description.
 * 3. Role update with new name, description, and complete permission replacement.
 * 4. Validates all updated fields match input data exactly.
 * 5. Confirms role_kind persists as 'custom' and timestamps are correctly maintained.
 */
export async function test_api_role_update_custom(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member with organization
  const memberConnection: api.IConnection = { host: connection.host };
  const memberOutput = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      org_logo_uri: typia.random<string & tags.Format<"uri">>(),
      href: "https://test.example.com/page",
      referrer: "https://test.example.com",
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberOutput);
  // Create new connection with member's access token for authenticated requests
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      ...connection.headers,
      Authorization: memberOutput.token.access,
    },
  };
  // 2. Create custom role
  const roleName1 = `TestRole${RandomGenerator.alphaNumeric(8)}`;
  const roleCreate = await api.functional.hrmPlatform.member.roles.create(
    authenticatedConnection,
    {
      body: {
        name: roleName1,
        description: "Initial custom role description",
        role_kind: "custom",
      } satisfies IHrmPlatformRole.ICreate,
    },
  );
  typia.assert(roleCreate);
  // Store original values for validation
  const originalId = roleCreate.id;
  const originalRoleKind = roleCreate.role_kind;
  const originalCreatedAt = roleCreate.created_at;
  // 3. Update custom role
  const roleName2 = `UpdatedRole${RandomGenerator.alphaNumeric(8)}`;
  const roleUpdate = await api.functional.hrmPlatform.member.roles.update(
    authenticatedConnection,
    {
      roleId: originalId,
      body: {
        name: roleName2,
        description: "Updated custom role description after modification",
        permissions: ["employee.view", "employee.edit", "project.create"],
      } satisfies IHrmPlatformRole.IUpdate,
    },
  );
  typia.assert(roleUpdate);
  // 4. Validate updated role data
  TestValidator.equals(
    "role ID unchanged after update",
    roleUpdate.id,
    originalId,
  );
  TestValidator.equals(
    "role_kind remains custom",
    roleUpdate.role_kind,
    originalRoleKind,
  );
  TestValidator.equals("name updated correctly", roleUpdate.name, roleName2);
  TestValidator.equals(
    "description updated correctly",
    roleUpdate.description,
    "Updated custom role description after modification",
  );
  TestValidator.equals(
    "permissions array replaced entirely",
    roleUpdate.permissions.map((p) => p.code),
    ["employee.view", "employee.edit", "project.create"],
  );
  TestValidator.equals(
    "created_at unchanged",
    roleUpdate.created_at,
    originalCreatedAt,
  );
  // Validate updated_at is different (time passed)
  const updatedAfterCreated =
    new Date(roleUpdate.updated_at) > new Date(originalCreatedAt);
  TestValidator.predicate(
    "updated_at reflects modification",
    updatedAfterCreated,
  );
}
