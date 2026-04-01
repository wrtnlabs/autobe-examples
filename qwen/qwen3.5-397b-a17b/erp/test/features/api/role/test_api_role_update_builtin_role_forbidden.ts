import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRolePermission";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that attempting to update a built-in role results in a 403 Forbidden error.
 *
 * This test validates the business rule that system-defined roles (Owner, Manager, Employee)
 * cannot be modified to maintain consistent permission structures across all organizations.
 *
 * Test flow:
 * 1. Register and authenticate as a member
 * 2. List all roles to find built-in roles (is_builtin=true)
 * 3. Select a built-in role's ID from the results
 * 4. Attempt to update the built-in role's name/description
 * 5. Verify the API rejects with 403 Forbidden error
 */
export async function test_api_role_update_builtin_role_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. List all roles to find built-in roles
  const rolesResponse = await api.functional.hrmPlatform.member.roles.index(
    memberConnection,
    {
      body: {
        is_builtin: true,
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformRole.IRequest,
    },
  );
  typia.assert(rolesResponse);
  // 3. Validate we have built-in roles and select one
  TestValidator.predicate(
    "has built-in roles",
    () => rolesResponse.data.length > 0,
  );
  const builtinRole = rolesResponse.data[0];
  // Verify it's actually a built-in role
  TestValidator.equals("role is builtin", builtinRole.is_builtin, true);
  // 4. Attempt to update the built-in role (should fail with 403)
  const updatePayload = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IHrmPlatformRole.IUpdate;
  // 5. Verify the API rejects with 403 Forbidden error
  await TestValidator.httpError(
    "built-in role update forbidden",
    403,
    async () => {
      await api.functional.hrmPlatform.member.roles.update(memberConnection, {
        roleId: builtinRole.id,
        body: updatePayload,
      });
    },
  );
}
