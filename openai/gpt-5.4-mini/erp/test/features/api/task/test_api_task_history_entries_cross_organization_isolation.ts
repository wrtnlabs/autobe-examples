import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import type { IErpHrmTimeTaskHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTaskHistoryEntry";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeTaskHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTaskHistoryEntry";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_task_history_entries_cross_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  const authConnection: api.IConnection = { host: connection.host };
  const authorization = await authorize_member_join(authConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd1234!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/",
      avatarImageUrl: null,
      phoneNumber: RandomGenerator.mobile(),
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(authorization);
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${authorization.token.access}`,
    },
  };
  await TestValidator.httpError(
    "cross-organization task history access must be rejected",
    [401, 403, 404],
    async () => {
      await api.functional.erpHrmTime.member.projects.tasks.historyEntries.index(
        memberConnection,
        {
          projectId: typia.random<string & tags.Format<"uuid">>(),
          taskId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            page: 1,
            pageSize: 10,
            limit: 10,
          } satisfies IErpHrmTimeTaskHistoryEntry.IRequest,
        },
      );
    },
  );
}
