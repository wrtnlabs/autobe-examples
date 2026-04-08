import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPermission";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that attempting to assign permissions to a built-in role is rejected.
 *
 * Validates that the HRM system properly prevents modification of built-in role permissions (Owner, Manager, Employee). A member user attempts to assign permissions to a built-in role, and the operation should be rejected with HTTP 403 Forbidden error.
 *
 * This test ensures the business rule that system-defined roles have immutable permissions is enforced, maintaining role-based access control integrity across the organization.
 *
 * 1. Register and authenticate a member user account.
 * 2. Create a member-specific connection with authentication token.
 * 3. Attempt to assign permissions to a built-in role using the role permissions assignment endpoint.
 * 4. Validate that the operation fails with HTTP 403 Forbidden error.
 * 5. Verify the error response indicates built-in roles cannot be modified.
 */
export async function test_api_role_permissions_assignment_builtin_role_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a member user
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: IHrmMember.IAuthorized =
    await api.functional.hrm.auth.member.join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmMember.IJoin,
    });
  typia.assert(memberAuth);
  // 2. Create member-specific connection with authentication token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: memberAuth.token.access,
    },
  };
  // 3-4. Attempt to assign permissions to a built-in role and validate 403 Forbidden
  const roleId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const permissionIds: (string & tags.Format<"uuid">)[] = ArrayUtil.repeat(
    3,
    () => typia.random<string & tags.Format<"uuid">>(),
  ) satisfies (string & tags.Format<"uuid">)[];
  await TestValidator.httpError(
    "built-in role permissions modification rejected",
    403,
    async () => {
      await api.functional.hrm.member.roles.permissions.assign(
        authenticatedConnection,
        {
          roleId,
          body: {
            permission_ids: permissionIds,
          } satisfies IHrmRolePermission.IAssign,
        },
      );
    },
  );
}
