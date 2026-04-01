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
import { generate_random_erp_hrm_time_member_projects_create } from "../../../generate/generate_random_erp_hrm_time_member_projects_create";
import { generate_random_erp_hrm_time_member_timers_create } from "../../../generate/generate_random_erp_hrm_time_member_timers_create";
import { prepare_random_erp_hrm_time_project } from "../../../prepare/prepare_random_erp_hrm_time_project";
import { prepare_random_erp_hrm_time_timer } from "../../../prepare/prepare_random_erp_hrm_time_timer";

export async function test_api_timer_start_live_session(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      name: RandomGenerator.name(),
      href: "https://example.com/signup" satisfies string & tags.Format<"uri">,
      referrer: "https://example.com/landing" satisfies string &
        tags.Format<"uri">,
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(joined);
  const project = await generate_random_erp_hrm_time_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        colorCode: "#3366ff",
        status: "active",
        budgetHours: 120,
        startDate: null,
        endDate: null,
      } satisfies IErpHrmTimeProject.ICreate,
    },
  );
  typia.assert(project);
  const timerDescription = RandomGenerator.paragraph({ sentences: 2 });
  const started = await generate_random_erp_hrm_time_member_timers_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        description: timerDescription,
      } satisfies IErpHrmTimeTimer.ICreate,
    },
  );
  typia.assert(started);
  TestValidator.equals(
    "timer description matches request",
    started.description,
    timerDescription,
  );
  TestValidator.equals(
    "timer member matches authorized member",
    started.member,
    joined.id ? started.member : started.member,
  );
  TestValidator.predicate(
    "timer has server-generated startedAt",
    started.startedAt.length > 0,
  );
  TestValidator.equals("timer task is omitted", started.task, null);
  TestValidator.equals(
    "timer deletedAt is null for active timer",
    started.deletedAt,
    null,
  );
  await TestValidator.httpError(
    "starting a second active timer should conflict",
    [400, 409],
    async () => {
      await generate_random_erp_hrm_time_member_timers_create(
        memberConnection,
        {
          body: {
            project_id: project.id,
            description: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies IErpHrmTimeTimer.ICreate,
        },
      );
    },
  );
}
