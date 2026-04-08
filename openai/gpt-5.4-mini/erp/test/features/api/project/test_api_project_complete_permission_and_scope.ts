import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_project_complete_permission_and_scope(
  connection: api.IConnection,
): Promise<void> {
  const joinConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123!",
      displayName: RandomGenerator.name(),
      href: connection.host,
      referrer: connection.host,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(joined);
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${joined.token.access}`,
    },
  };
  const projectId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "member without project management permission cannot complete a project",
    async () => {
      await api.functional.erpHrmTime.member.projects.complete(
        memberConnection,
        {
          projectId,
        },
      );
    },
  );
  const foreignContextConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${joined.token.access}`,
    },
  };
  await TestValidator.error(
    "completing a project outside the current organization context is rejected",
    async () => {
      await api.functional.erpHrmTime.member.projects.complete(
        foreignContextConnection,
        {
          projectId,
        },
      );
    },
  );
}
