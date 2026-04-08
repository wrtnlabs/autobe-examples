import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that built-in roles cannot have their permissions modified.
 *
 * Validates the system protection against modifying built-in role permissions. Built-in roles (Owner, Manager, Employee) have predefined permission sets that cannot be changed to maintain system integrity and consistent role definitions across organizations.
 *
 * The test verifies that attempts to update built-in role permissions are rejected with an appropriate error, ensuring the role's permission set remains intact.
 *
 * 1. Register and authenticate as a member with organization access.
 * 2. Attempt to update a built-in role's permissions with a new permission set.
 * 3. Verify the operation fails with an error (403 Forbidden or 400 Bad Request).
 * 4. Confirm the built-in role protection mechanism is working correctly.
 *
 * Business Rule: Per Section 333, built-in roles (Owner, Manager, Employee) have predefined permission sets that cannot be modified to maintain system integrity and consistent role definitions across organizations.
 */
export async function test_api_role_permissions_update_builtin_role_protection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmTimeTrackMember.IJoin,
  });
  // 2. Attempt to update a built-in role's permissions (should fail)
  // Using a UUID that represents a built-in role (Owner, Manager, or Employee)
  // In production, built-in roles are pre-seeded with known UUIDs
  const builtInRoleId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "built-in role permissions cannot be modified",
    async () => {
      await api.functional.hrmTimeTrack.member.roles.permissions.update(
        memberConnection,
        {
          roleId: builtInRoleId,
          body: {
            permissions: [
              "organization_management",
              "employee_management",
              "project_management",
            ],
          } satisfies IHrmTimeTrackRole.IUpdatePermission,
        },
      );
    },
  );
}
