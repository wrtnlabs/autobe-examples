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

export async function test_api_role_permission_update_cross_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  const sourceJoinConnection: api.IConnection = { host: connection.host };
  const foreignJoinConnection: api.IConnection = { host: connection.host };
  const sourceAuthorized = await authorize_member_join(sourceJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      displayName: RandomGenerator.name(),
      href: `https://example.com/${RandomGenerator.alphabets(8)}`,
      referrer: `https://example.com/${RandomGenerator.alphabets(8)}`,
      avatarImageUrl: null,
      phoneNumber: null,
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(sourceAuthorized);
  const foreignAuthorized = await authorize_member_join(foreignJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      displayName: RandomGenerator.name(),
      href: `https://example.com/${RandomGenerator.alphabets(8)}`,
      referrer: `https://example.com/${RandomGenerator.alphabets(8)}`,
      avatarImageUrl: null,
      phoneNumber: null,
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(foreignAuthorized);
  const sourceConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${sourceAuthorized.token.access}`,
    },
  };
  const foreignConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${foreignAuthorized.token.access}`,
    },
  };
  const foreignRoleId = typia.random<string & tags.Format<"uuid">>();
  const foreignBaseline =
    await api.functional.erpHrmTime.member.roles.permissions.updatePermissions(
      foreignConnection,
      {
        roleId: foreignRoleId,
        body: {
          permissions: [],
        } satisfies IErpHrmTimeRole.IUpdatePermission,
      },
    );
  typia.assert(foreignBaseline);
  await TestValidator.httpError(
    "cross-organization role permission update should be rejected",
    [403, 404],
    async () => {
      await api.functional.erpHrmTime.member.roles.permissions.updatePermissions(
        sourceConnection,
        {
          roleId: foreignRoleId,
          body: {
            permissions: ["org:manage"],
          } satisfies IErpHrmTimeRole.IUpdatePermission,
        },
      );
    },
  );
  const foreignAfter =
    await api.functional.erpHrmTime.member.roles.permissions.updatePermissions(
      foreignConnection,
      {
        roleId: foreignRoleId,
        body: {
          permissions: [],
        } satisfies IErpHrmTimeRole.IUpdatePermission,
      },
    );
  typia.assert(foreignAfter);
  TestValidator.equals(
    "foreign role permissions remain unchanged",
    foreignAfter.permissions,
    foreignBaseline.permissions,
  );
  TestValidator.equals(
    "foreign role id remains unchanged",
    foreignAfter.id,
    foreignBaseline.id,
  );
}
