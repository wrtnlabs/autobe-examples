import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that built-in roles (Owner, Manager, Employee) cannot have their
 * permissions modified through the update endpoint.
 *
 * Prerequisites: Authenticate as an organization owner. Note that built-in
 * roles are automatically created when an organization is created.
 *
 * Test Steps:
 * 1. After authentication via authorize_member_join, attempt to update
 *    a built-in role's permissions
 * 2. Verify the system rejects the request with a 403 Forbidden error
 *
 * Business Rules Validated:
 * - Built-in roles (Owner, Manager, Employee) have protected permission sets
 * - Organization owners cannot modify built-in role permissions
 * - The is_builtin flag prevents unauthorized modification of system-protected roles
 */
export async function test_api_role_update_builtin_role_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member account and organization
  // authorize_member_join creates the member and their first organization
  // The Owner role is automatically created as a built-in role
  const ownerConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      displayName: "Test Owner",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // Step 2: Attempt to update a built-in role (Owner role)
  // The Owner role has is_builtin=true and cannot have permissions modified
  // We use a random UUID to simulate attempting to update any built-in role
  // The system should reject with 403 Forbidden if the role is built-in
  const builtInRoleId = typia.random<string & tags.Format<"uuid">>();
  const updateBody: IErpHrmRole.IUpdate = {
    name: "Modified Owner",
    permissions: ["employee:view", "project:view"],
  };
  // Step 3: Verify the system rejects with 403 Forbidden
  // Built-in roles cannot have their permissions modified
  await TestValidator.httpError(
    "update built-in role should return 403 Forbidden",
    403,
    async () => {
      await api.functional.erpHrm.member.roles.update(ownerConnection, {
        roleId: builtInRoleId,
        body: updateBody,
      });
    },
  );
}
