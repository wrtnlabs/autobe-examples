import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import type { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import type { IErpHrmTimeTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTask";
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

export async function test_api_timer_get_current_running_timer(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      name: RandomGenerator.name(),
      href: "https://example.com/register" as string & tags.Format<"uri">,
      referrer: "https://example.com/" as string & tags.Format<"uri">,
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const timerCreated = await generate_random_erp_hrm_time_member_timers_create(
    memberConnection,
    { body: {} as IErpHrmTimeTimer.ICreate },
  );
  typia.assert(timerCreated);
  const timer = await api.functional.erpHrmTime.member.timers.at(
    memberConnection,
    {
      timerId: timerCreated.id,
    },
  );
  typia.assert(timer);
  TestValidator.equals("timer id matches", timer.id, timerCreated.id);
  TestValidator.equals("member matches", timer.member, timerCreated.member);
  TestValidator.equals(
    "employee matches",
    timer.employee,
    timerCreated.employee,
  );
  TestValidator.equals("project matches", timer.project, timerCreated.project);
  TestValidator.equals("task matches", timer.task, timerCreated.task);
  TestValidator.equals(
    "startedAt matches",
    timer.startedAt,
    timerCreated.startedAt,
  );
  TestValidator.equals(
    "description matches",
    timer.description,
    timerCreated.description,
  );
  TestValidator.equals(
    "createdAt matches",
    timer.createdAt,
    timerCreated.createdAt,
  );
  TestValidator.equals(
    "updatedAt matches",
    timer.updatedAt,
    timerCreated.updatedAt,
  );
  TestValidator.equals(
    "deletedAt matches",
    timer.deletedAt,
    timerCreated.deletedAt,
  );
  TestValidator.equals(
    "timer remains active after read",
    timer.deletedAt,
    null,
  );
}
