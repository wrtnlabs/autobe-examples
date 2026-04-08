import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_role_permission_removal_from_built_in_role_protected(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd123!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/referrer",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const rolesPage = await api.functional.erpHrmTime.member.roles.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 100,
        isBuiltin: true,
      } satisfies IErpHrmTimeRole.IRequest,
    },
  );
  typia.assert(rolesPage);
  const builtInRole =
    rolesPage.data.find((role) => role.name === "Owner") ??
    rolesPage.data.find((role) => role.name === "Manager") ??
    rolesPage.data.find((role) => role.name === "Employee") ??
    rolesPage.data[0];
  TestValidator.predicate(
    "built-in role list should include at least one protected role",
    builtInRole !== undefined,
  );
  typia.assert(builtInRole!);
  await TestValidator.error(
    "deleting permission from built-in role should be rejected",
    async () => {
      await api.functional.erpHrmTime.member.roles.permissions.erase(
        memberConnection,
        {
          roleId: builtInRole.id,
          rolePermissionId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  const rolesPageAfter = await api.functional.erpHrmTime.member.roles.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 100,
        isBuiltin: true,
      } satisfies IErpHrmTimeRole.IRequest,
    },
  );
  typia.assert(rolesPageAfter);
  TestValidator.predicate(
    "built-in role remains visible after rejected permission removal",
    rolesPageAfter.data.some((role) => role.id === builtInRole.id),
  );
}
