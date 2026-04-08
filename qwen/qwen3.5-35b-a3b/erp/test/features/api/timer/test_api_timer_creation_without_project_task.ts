import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_timers_create } from "../../../generate/generate_random_hrm_platform_member_timers_create";
import { prepare_random_hrm_platform_timer } from "../../../prepare/prepare_random_hrm_platform_timer";

export async function test_api_timer_creation_without_project_task(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      org_logo_uri: typia.random<string & tags.Format<"uri">>(),
      org_timezone: RandomGenerator.pick([
        "UTC",
        "Asia/Seoul",
        "America/New_York",
      ]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create timer with valid project and task UUIDs (required by IHrmPlatformTimer DTO)
  const timerConnection: api.IConnection = { host: connection.host };
  const timer = await api.functional.hrmPlatform.member.timers.create(
    timerConnection,
    {
      body: {
        hrm_platform_project_id: typia.random<string & tags.Format<"uuid">>(),
        hrm_platform_task_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IHrmPlatformTimer.ICreate,
    },
  );
  typia.assert(timer);
  // 3. Validate timer has correct values
  TestValidator.equals("status is started", timer.status, "started");
  TestValidator.equals("duration is zero", timer.duration_seconds, 0);
  TestValidator.equals(
    "employee_id is valid UUID",
    timer.hrm_platform_employee_id,
    memberAuth.member.id satisfies string & tags.Format<"uuid">,
  );
  TestValidator.equals("deleted_at is null", timer.deleted_at, null);
  TestValidator.predicate(
    "created_at is valid date-time",
    /d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(timer.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    /d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(timer.updated_at),
  );
  TestValidator.predicate(
    "last_tick_at is valid date-time",
    /d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(timer.last_tick_at),
  );
}