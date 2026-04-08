import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimePermission";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_role_permission_update_custom_role(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      displayName: RandomGenerator.name(),
      avatarImageUrl: null,
      phoneNumber: null,
      href: "https://example.com/register",
      referrer: "https://example.com",
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  const roleId = typia.random<string & tags.Format<"uuid">>();
  const nextPermissions = ["org:manage", "project:view"] as const;
  const role =
    await api.functional.erpHrmTime.member.roles.permissions.updatePermissions(
      ownerConnection,
      {
        roleId,
        body: {
          permissions: [...nextPermissions],
        } satisfies IErpHrmTimeRole.IUpdatePermission,
      },
    );
  typia.assert(role);
  TestValidator.equals("role id should be preserved", role.id, roleId);
  TestValidator.predicate(
    "role should remain custom",
    role.isBuiltin === false,
  );
  TestValidator.equals(
    "permission set should match the requested replacement list",
    role.permissions.map((permission) => permission.key).sort(),
    [...nextPermissions].sort(),
  );
  if (role.organization !== null && role.organization !== undefined) {
    typia.assertGuard(role.organization);
  }
  await TestValidator.httpError(
    "invalid catalog permission should be rejected",
    [400, 404, 409, 422],
    async () => {
      await api.functional.erpHrmTime.member.roles.permissions.updatePermissions(
        ownerConnection,
        {
          roleId,
          body: {
            permissions: ["org:manage", "not:approved"],
          } satisfies IErpHrmTimeRole.IUpdatePermission,
        },
      );
    },
  );
}
