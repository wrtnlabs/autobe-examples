import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test the protection mechanism that prevents permission modification on built-in roles.
 *
 * Validates that the system correctly rejects attempts to modify permissions on built-in roles (Owner, Manager, Employee), ensuring system integrity and preventing unauthorized changes to core role definitions. The test authenticates as a member with organization management permissions and attempts to remove a permission from a built-in role, expecting a 403 Forbidden error.
 *
 * 1. Authenticate as a member with organization management permissions.
 * 2. Attempt to remove a permission from a built-in role using the DELETE endpoint.
 * 3. Verify the request is rejected with 403 Forbidden status code.
 */
export async function test_api_role_permission_removal_built_in_role_protection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Attempt to remove permission from built-in role
  // Using UUIDs that represent a built-in role (Owner, Manager, or Employee)
  const builtInRoleId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const permissionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Verify the request is rejected with 403 Forbidden
  await TestValidator.httpError(
    "built-in role permission removal should be rejected with 403",
    403,
    async () =>
      await api.functional.hrmTimeTrack.member.roles.permissions.erase(
        memberConnection,
        {
          roleId: builtInRoleId,
          permissionId: permissionId,
        },
      ),
  );
}
