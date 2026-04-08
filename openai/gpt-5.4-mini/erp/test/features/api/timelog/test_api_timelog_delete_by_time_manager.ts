import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import type { IErpHrmTimeTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTask";
import type { IErpHrmTimeTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_time_member_timelogs_create";
import { prepare_random_erp_hrm_time_timelog } from "../../../prepare/prepare_random_erp_hrm_time_timelog";

export async function test_api_timelog_delete_by_time_manager(
  connection: api.IConnection,
): Promise<void> {
  const managerConnection: api.IConnection = { host: connection.host };
  const otherConnection: api.IConnection = { host: connection.host };
  const manager = await authorize_member_join(managerConnection, {
    body: {
      email: `manager-${typia.random<string & tags.Format<"uuid">>()}@example.com`,
      password: "password123!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  managerConnection.headers = {
    Authorization: `Bearer ${manager.token.access}`,
  };
  const other = await authorize_member_join(otherConnection, {
    body: {
      email: `other-${typia.random<string & tags.Format<"uuid">>()}@example.com`,
      password: "password123!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  otherConnection.headers = { Authorization: `Bearer ${other.token.access}` };
  const timelog = await api.functional.erpHrmTime.member.timelogs.create(
    managerConnection,
    {
      body: {
        workDate: new Date().toISOString(),
        durationMinutes: 60,
        projectId: typia.random<string & tags.Format<"uuid">>(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: true,
      } satisfies IErpHrmTimeTimelog.ICreate,
    },
  );
  typia.assert(timelog);
  await api.functional.erpHrmTime.member.timelogs.erase(managerConnection, {
    timelogId: timelog.id,
  });
  await TestValidator.httpError(
    "other member cannot delete a deleted timelog again",
    [403, 404],
    async () => {
      await api.functional.erpHrmTime.member.timelogs.erase(otherConnection, {
        timelogId: timelog.id,
      });
    },
  );
}
