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
 * Validates custom role retrieval for a specific role ID within an organization.
 *
 * The test sets up a member authentication context, creates a custom role with specified permissions,
 * retrieves the role by its ID, and verifies that the returned data matches the creation data,
 * confirming the `built_in` flag is false and permissions count is correct.
 *
 * 1. Authenticates as a new member.
 * 2. Creates a custom role with specific name and permission keys.
 * 3. Retrieves the role using the ID from the creation response.
 * 4. Validates response properties: ID, name, built_in status, and permission count.
 */
export async function test_api_custom_role_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup connection isolation
  const memberConnection: api.IConnection = { host: connection.host };
  // 2. Authenticate member using utility function
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 3. Create custom role using utility function
  const rolePermissionKeys = ["org:manage", "time:manage"] as const;
  const createBody = {
    name: RandomGenerator.paragraph({ sentences: 1 }),
    permissionKeys: [...rolePermissionKeys],
    description: null,
  } satisfies IHrmPlatformRole.ICreate;
  const createdRole = await generate_random_hrm_platform_member_roles_create(
    memberConnection,
    { body: createBody },
  );
  typia.assert(createdRole);
  // 4. Retrieve role by ID using SDK function
  const retrievedRole = await api.functional.hrmPlatform.member.roles.at(
    memberConnection,
    { roleId: createdRole.id },
  );
  typia.assert(retrievedRole);
  // 5. Validate response
  TestValidator.equals(
    "role ID matches creation",
    retrievedRole.id,
    createdRole.id,
  );
  TestValidator.equals(
    "role name matches creation",
    retrievedRole.name,
    createBody.name,
  );
  TestValidator.predicate("role is not built-in", !retrievedRole.built_in);
  TestValidator.equals(
    "permission count matches creation",
    retrievedRole.rolePermissions.length,
    createBody.permissionKeys.length,
  );
}
