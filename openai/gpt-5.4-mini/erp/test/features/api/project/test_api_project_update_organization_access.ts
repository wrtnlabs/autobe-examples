import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_project_update_organization_access(
  connection: api.IConnection,
): Promise<void> {
  const outsiderConnection: api.IConnection = { host: connection.host };
  const outsider = await authorize_member_join(outsiderConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(outsider);
  await TestValidator.httpError(
    "cross-organization project update should be inaccessible",
    [400, 401, 403, 404],
    async () => {
      await api.functional.hrmTimeTracking.member.projects.update(
        outsiderConnection,
        {
          projectId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            name: RandomGenerator.name(),
            description: RandomGenerator.paragraph({ sentences: 2 }),
            color_code: "#3366ff",
            status: "active",
            budget_hours: 8,
            start_date: new Date().toISOString(),
            end_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          } satisfies IHrmTimeTrackingProject.IUpdate,
        },
      );
    },
  );
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(member);
  await TestValidator.httpError(
    "member without project management permission should not update project",
    [400, 401, 403, 404],
    async () => {
      await api.functional.hrmTimeTracking.member.projects.update(
        memberConnection,
        {
          projectId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            name: RandomGenerator.name(),
          } satisfies IHrmTimeTrackingProject.IUpdate,
        },
      );
    },
  );
}
