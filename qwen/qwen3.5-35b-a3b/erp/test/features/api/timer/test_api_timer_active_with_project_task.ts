import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import type { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import type { IHrmsTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_timer_start_create } from "../../../generate/generate_random_hrms_member_timer_start_create";
import { prepare_random_hrms_timer } from "../../../prepare/prepare_random_hrms_timer";

export async function test_api_timer_active_with_project_task(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member (authenticate via join)
  const joinConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(member);
  // 2. Start timer using utility function with member's connection
  const timer = await generate_random_hrms_member_timer_start_create(
    { host: connection.host, headers: { Authorization: member.token.access } },
    {
      body: {
        project_id: typia.random<string & tags.Format<"uuid">>(),
        task_id: typia.random<string & tags.Format<"uuid">>(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IHrmsTimer.ICreate,
    },
  );
  typia.assert(timer);
  // 3. Retrieve active timer
  const activeTimer = await api.functional.hrms.member.timer.active.getActive({
    host: connection.host,
    headers: { Authorization: member.token.access },
  });
  typia.assert(activeTimer);
  // 4. Validate timer data
  TestValidator.equals("timer is not null", activeTimer, timer);
  TestValidator.equals(
    "project_id matches",
    activeTimer.project.id,
    timer.project.id,
  );
  TestValidator.equals(
    "project name matches",
    activeTimer.project.name,
    timer.project.name,
  );
  TestValidator.equals(
    "color_code matches",
    activeTimer.project.color_code,
    timer.project.color_code,
  );
  TestValidator.equals(
    "description matches",
    activeTimer.description,
    timer.description,
  );
  TestValidator.equals(
    "start_at matches",
    activeTimer.start_at,
    timer.start_at,
  );
  // 5. Calculate elapsed time
  const startTime = new Date(activeTimer.start_at);
  const now = new Date();
  const elapsedMinutes = Math.floor(
    (now.getTime() - startTime.getTime()) / 60000,
  );
  TestValidator.predicate("elapsed time is positive", elapsedMinutes >= 0);
}
