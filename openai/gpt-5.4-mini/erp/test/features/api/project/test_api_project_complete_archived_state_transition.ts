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

export async function test_api_project_complete_archived_state_transition(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      displayName: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(joined);
  const projectId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "completing an archived project should either fail with a business error or return a completed project",
    async () => {
      const project = await api.functional.erpHrmTime.member.projects.complete(
        memberConnection,
        { projectId },
      );
      typia.assert(project);
      TestValidator.predicate(
        "returned project is in a terminal lifecycle state",
        project.status === "completed" || project.status === "archived",
      );
    },
  );
}
