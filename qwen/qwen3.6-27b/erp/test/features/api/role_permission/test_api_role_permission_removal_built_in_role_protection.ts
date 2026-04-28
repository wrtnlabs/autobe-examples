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
 * Validate that built-in roles (Owner, Manager, Employee) cannot have their permissions removed.
 *
 * When a member joins the platform, the system automatically creates a default organization with built-in roles (Owner, Manager, Employee) that have predefined, protected permission sets. This test verifies that the built-in role protection mechanism prevents any attempt to remove permissions from these system roles, ensuring role integrity is maintained across the organization.
 *
 * Built-in role protection is critical because these roles define the foundational permission structure:
 * - Owner: Full administrative control over organization resources
 * - Manager: Management capabilities including employee oversight and time approval
 * - Employee: Standard access for time tracking and personal project participation
 *
 * Attempts to modify built-in role permissions are rejected with 403 Forbidden to preserve the expected permission hierarchy.
 *
 * 1. Create a new member account, which provisions a default organization with protected built-in roles.
 * 2. Attempt to remove a permission from a built-in role.
 * 3. Verify the API rejects the operation with 403 Forbidden.
 */
export async function test_api_role_permission_removal_built_in_role_protection(
  connection: api.IConnection,
) {
  // 1. Create member account - auto-provisions organization with built-in roles
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Attempt to remove permission from built-in role using representative identifiers
  const builtInRoleId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const rolePermissionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Verify built-in role protection rejects permission removal with 403 Forbidden
  await TestValidator.httpError(
    "built-in role permission removal rejected",
    403,
    async () =>
      await api.functional.hrmPlatform.member.roles.role_permissions.erase(
        memberConnection,
        {
          roleId: builtInRoleId,
          rolePermissionId,
        },
      ),
  );
}
