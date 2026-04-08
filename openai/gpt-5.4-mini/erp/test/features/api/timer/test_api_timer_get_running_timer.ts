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
import type { IErpHrmTimeTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_member_timers_create } from "../../../generate/generate_random_erp_hrm_time_member_timers_create";
import { prepare_random_erp_hrm_time_timer } from "../../../prepare/prepare_random_erp_hrm_time_timer";

export async function test_api_timer_get_running_timer(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123!" satisfies string & tags.Format<"password">,
      displayName: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  memberConnection.headers = {
    Authorization: authorized.token.access,
  };
  const runningTimer = await generate_random_erp_hrm_time_member_timers_create(
    memberConnection,
    {
      body: {
        project_id: typia.random<string & tags.Format<"uuid">>(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IErpHrmTimeTimer.ICreate,
    },
  );
  typia.assert(runningTimer);
  const output =
    await api.functional.erpHrmTime.member.timers.get(memberConnection);
  typia.assert(output);
  TestValidator.equals("timer id matches", output.id, runningTimer.id);
  TestValidator.equals(
    "timer member matches",
    output.member,
    runningTimer.member,
  );
  TestValidator.equals(
    "timer employee matches",
    output.employee,
    runningTimer.employee,
  );
  TestValidator.equals(
    "timer project matches",
    output.project,
    runningTimer.project,
  );
  TestValidator.equals("timer task matches", output.task, runningTimer.task);
  TestValidator.equals(
    "timer description matches",
    output.description,
    runningTimer.description,
  );
  TestValidator.equals(
    "timer startedAt matches",
    output.startedAt,
    runningTimer.startedAt,
  );
  TestValidator.equals(
    "timer deletedAt matches",
    output.deletedAt,
    runningTimer.deletedAt,
  );
}
