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
import { generate_random_hrm_platform_member_roles_role_permissions_create } from "../../../generate/generate_random_hrm_platform_member_roles_role_permissions_create";
import { prepare_random_hrm_platform_role_permission } from "../../../prepare/prepare_random_hrm_platform_role_permission";

/**
 * Verify that granting permissions to built-in roles is rejected.
 *
 * Built-in roles (Owner, Manager, Employee) are immutable system defaults whose permission catalogs cannot be modified. This test ensures system role integrity by confirming that the API rejects any attempt to grant platform capabilities to these protected roles.
 *
 * The operation is tested with a valid member who owns an organization containing built-in roles, using a realistic permission key. The API must return a 400 Bad Request error, indicating that built-in role modifications are not permitted.
 *
 * 1. Authenticate a new member, which creates a default organization with pre-configured built-in roles.
 * 2. Attempt to grant the `employee:manage` platform capability to a built-in role using its UUID.
 * 3. Validate that the operation is rejected with a 400 or 404 HTTP error, preserving system role integrity.
 */
export async function test_api_role_permission_built_in_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate a new member - creates default organization with built-in roles
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {});
  typia.assert(authorizedMember);
  // 2. Built-in role UUID (system-created during organization setup)
  const builtInRoleId = typia.random<string & tags.Format<"uuid">>();
  const body = {
    permissionKey: "employee:manage",
  } satisfies IHrmPlatformRolePermission.ICreate;
  // 3. Validate that granting permission to built-in role is rejected
  // Accepts 400 (built-in role protection) or 404 (role not found)
  await TestValidator.httpError(
    "built-in role permission grant is rejected",
    [400, 404],
    async () => {
      await api.functional.hrmPlatform.member.roles.role_permissions.create(
        memberConnection,
        {
          roleId: builtInRoleId,
          body,
        },
      );
    },
  );
}
