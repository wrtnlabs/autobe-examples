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

export async function test_api_timer_start_running_session(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      displayName: RandomGenerator.name(),
      avatarImageUrl: null,
      phoneNumber: null,
      href: "https://example.com/onboarding",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(joined);
  const projectId = typia.random<string & tags.Format<"uuid">>();
  const description = RandomGenerator.paragraph({ sentences: 3 });
  const taskId: (string & tags.Format<"uuid">) | null = null;
  const timer = await generate_random_erp_hrm_time_member_timers_create(
    memberConnection,
    {
      body: {
        project_id: projectId,
        task_id: taskId,
        description,
      } satisfies IErpHrmTimeTimer.ICreate,
    },
  );
  typia.assert(timer);
  TestValidator.equals(
    "timer description preserved",
    timer.description,
    description,
  );
  TestValidator.equals(
    "timer deletedAt is null while active",
    timer.deletedAt,
    null,
  );
  TestValidator.predicate("timer id is populated", timer.id.length > 0);
  TestValidator.predicate(
    "timer startedAt populated",
    timer.startedAt.length > 0,
  );
  TestValidator.predicate(
    "timer createdAt populated",
    timer.createdAt.length > 0,
  );
  TestValidator.predicate(
    "timer updatedAt populated",
    timer.updatedAt.length > 0,
  );
  TestValidator.predicate(
    "timer has member relation",
    timer.member !== null && timer.member !== undefined,
  );
  TestValidator.predicate(
    "timer has employee relation",
    timer.employee !== null && timer.employee !== undefined,
  );
  TestValidator.predicate(
    "timer has project relation",
    timer.project !== null && timer.project !== undefined,
  );
  await TestValidator.error(
    "second active timer should be rejected",
    async () => {
      await generate_random_erp_hrm_time_member_timers_create(
        memberConnection,
        {
          body: {
            project_id: projectId,
            task_id: taskId,
            description,
          } satisfies IErpHrmTimeTimer.ICreate,
        },
      );
    },
  );
}
