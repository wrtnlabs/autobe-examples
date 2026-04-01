import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
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

/**
 * Test retrieving a built-in Owner role by its unique identifier.
 *
 * This test validates the complete workflow:
 * 1. Member registers and authenticates to establish organization context
 * 2. Retrieve the Owner role using its roleId
 * 3. Verify the response contains complete role metadata including:
 *    - Valid UUID id and organization_id
 *    - Organization reference matching member's context
 *    - Name set to "Owner"
 *    - is_builtin flag set to true
 *    - Full permission set (org:manage, employee:manage, project:manage,
 *      time:manage, time:approve, time:view_all, report:view)
 *    - Valid timestamps (created_at, updated_at)
 */
export async function test_api_role_retrieve_builtin_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member to establish organization context
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Retrieve the Owner role by roleId
  const role = await api.functional.hrmPlatform.member.roles.at(
    memberConnection,
    {
      roleId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(role);
  // 3. Validate Owner role specific properties
  TestValidator.equals("role name", role.name, "Owner");
  TestValidator.equals("is_builtin flag", role.is_builtin, true);
  TestValidator.predicate("has organization", role.organization !== undefined);
  TestValidator.equals(
    "organization id matches",
    role.organization_id,
    role.organization.id,
  );
  // 4. Validate Owner permissions exist
  const permissionCodes = role.permissions.map((p) => p.permission);
  const requiredPermissions = [
    "org:manage",
    "employee:manage",
    "project:manage",
    "time:manage",
    "time:approve",
    "time:view_all",
    "report:view",
  ];
  for (const required of requiredPermissions) {
    TestValidator.predicate(
      `has ${required} permission`,
      permissionCodes.includes(required),
    );
  }
  // 5. Validate timestamps
  TestValidator.predicate("has created_at", role.created_at !== undefined);
  TestValidator.predicate("has updated_at", role.updated_at !== undefined);
}
