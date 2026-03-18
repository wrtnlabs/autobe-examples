import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_role_update_builtin_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register as an organization owner
  const joinConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Find the built-in role from the response
  const builtinRoleMembership = ownerAuth.organization_memberships.find(
    (m) => m.organizationRole.is_builtin === true,
  );
  TestValidator.predicate(
    "should have at least one built-in role",
    builtinRoleMembership !== undefined,
  );
  const role = typia.assert(builtinRoleMembership!);
  const roleId = role.organizationRole.id;
  const originalRoleName = role.organizationRole.name;
  // 3. Create actor-specific connection for authenticated user
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = { Authorization: ownerAuth.token.access };
  // 4. Attempt to update the built-in role with a new name
  await TestValidator.httpError(
    "should reject update of built-in role with new name",
    400,
    async () => {
      await api.functional.hrms.member.roles.update(userConnection, {
        roleId,
        body: {
          name: `Updated ${originalRoleName}`,
        } satisfies IHrmsOrganizationRole.IUpdate,
      });
    },
  );
  // 5. Attempt to update the built-in role with new permissions
  await TestValidator.httpError(
    "should reject update of built-in role with new permissions",
    400,
    async () => {
      await api.functional.hrms.member.roles.update(userConnection, {
        roleId,
        body: {
          permissions: ["employee:view"],
        } satisfies IHrmsOrganizationRole.IUpdate,
      });
    },
  );
  // 6. Verify the role remains unchanged
  TestValidator.predicate(
    "built-in role should remain immutable",
    role.organizationRole.is_builtin === true,
  );
}
