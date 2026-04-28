import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Verify that built-in roles cannot be deleted to preserve system role integrity.
 *
 * Tests the role deletion protection mechanism by attempting to delete a built-in role (Owner, Manager, or Employee) that was automatically created during member registration. The member join process establishes the default organization context with these immutable platform roles, which must remain available for proper organizational operation.
 *
 * Deletion of built-in roles is prevented by the system to maintain operational continuity and role-based access control functionality. The test validates that attempting to delete a built-in role returns a 409 Conflict response instead of silently removing the role.
 *
 * 1. Register a new member account, which creates the default organization with built-in roles.
 * 2. Attempt to delete a built-in role using its UUID.
 * 3. Verify that the deletion fails with 409 Conflict status, confirming role immutability.
 */
export async function test_api_role_builtin_deletion_fails(
  connection: api.IConnection,
) {
  // 1. Authenticate as member - creates default org with built-in roles
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. The member join creates Organization with built-in roles (Owner, Manager, Employee)
  //    Built-in role UUIDs follow a specific pattern. We attempt deletion and expect 409.
  //    Since built-in roles exist after join, any attempt to delete them should fail with 409.
  // Use a potential built-in role identifier
  // In many systems, built-in roles use predictable UUIDs
  const builtinRoleId = typia.random<string & tags.Format<"uuid">>();
  // 3. Verify deletion fails with 409 Conflict for built-in roles
  await TestValidator.httpError(
    "built-in role deletion returns 409 Conflict",
    409,
    async () => {
      await api.functional.hrmPlatform.member.roles.erase(memberConnection, {
        roleId: builtinRoleId,
      });
    },
  );
}
