import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeActivityLogEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeActivityLogEntry";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeActivityLogEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeActivityLogEntry";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_activity_log_entries_permission_and_context_isolation(
  connection: api.IConnection,
): Promise<void> {
  const auth = await authorize_member_join(
    { host: connection.host },
    {
      body: {
        email: `member_${typia.random<string & tags.Format<"uuid">>()}@example.com`,
        password: "P@ssw0rd123!",
        displayName: RandomGenerator.name(),
        href: "https://example.com/erp/join",
        referrer: "https://example.com/",
      } satisfies IErpHrmTimeMember.IJoin,
    },
  );
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    Authorization: `Bearer ${auth.token.access}`,
  };
  await TestValidator.error(
    "member without activity-log permission should not browse activity log",
    async () => {
      await api.functional.erpHrmTime.member.activity_log_entries.index(
        memberConnection,
        {
          body: {
            page: 1,
            limit: 10,
          } satisfies IErpHrmTimeActivityLogEntry.IRequest,
        },
      );
    },
  );
  await TestValidator.error(
    "member activity log browsing remains inaccessible without the proper organization context and permission",
    async () => {
      await api.functional.erpHrmTime.member.activity_log_entries.index(
        memberConnection,
        {
          body: {
            actionType: "project.created",
            memberId: auth.id,
            page: 1,
            limit: 5,
          } satisfies IErpHrmTimeActivityLogEntry.IRequest,
        },
      );
    },
  );
}
