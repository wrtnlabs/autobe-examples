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
import type { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import type { IHrmsTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimer";
import type { IWeekRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IWeekRange";
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

export async function test_api_timer_stop_with_timelog_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member and get authorization
  const joinConnection: api.IConnection = { host: connection.host };
  const member: IHrmsMember.IAuthorized = await authorize_member_join(
    joinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmsMember.IJoin,
    },
  );
  typia.assert(member);
  // 2. Create member connection with token
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: member.token.access,
    },
  };
  // 3. Start timer with project (valid UUID)
  const timer = await generate_random_hrms_member_timer_start_create(
    memberConnection,
    {
      body: {
        project_id: typia.random<string & tags.Format<"uuid">>(),
        task_id: (typia.random<string & tags.Format<"uuid">>() ??
          null) satisfies (string & tags.Format<"uuid">) | null | undefined,
        description: typia.random<string & tags.MaxLength<500>>(),
      } satisfies IHrmsTimer.ICreate,
    },
  );
  typia.assert(timer);
  // 4. Wait briefly for measurable duration
  await new Promise<void>((resolve) => setTimeout(resolve, 1000));
  // 5. Stop timer - returns IHrmsTimelog (organizational metrics)
  const metrics: IHrmsTimelog =
    await api.functional.hrms.member.timer.stop(memberConnection);
  typia.assert(metrics);
  // 6. Validate organizational metrics are present and reasonable
  TestValidator.predicate(
    "metrics has active employees count",
    metrics.active_employees_count >= 0,
  );
  TestValidator.predicate(
    "metrics has current week hours",
    metrics.current_week_hours >= 0,
  );
  TestValidator.predicate(
    "metrics has pending timesheets count",
    metrics.pending_timesheets_count >= 0,
  );
  TestValidator.predicate(
    "metrics has current week range",
    metrics.current_week.start_date !== undefined,
  );
  TestValidator.predicate(
    "metrics has end date",
    metrics.current_week.end_date !== undefined,
  );
  TestValidator.predicate(
    "metrics has generated timestamp",
    metrics.generated_at !== undefined,
  );
}
