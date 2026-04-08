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

export async function test_api_timer_discard_running_timer(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Abcd1234!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(joined);
  const timer = await generate_random_erp_hrm_time_member_timers_create(
    memberConnection,
    {
      body: {
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(timer);
  TestValidator.equals(
    "running timer should be active before discard",
    timer.deletedAt,
    null,
  );
  const discarded =
    await api.functional.erpHrmTime.member.timers.discard.erase(
      memberConnection,
    );
  typia.assert(discarded);
  TestValidator.equals(
    "discarded timer should keep the same id",
    discarded.id,
    timer.id,
  );
  TestValidator.equals(
    "discarded timer should preserve startedAt",
    discarded.startedAt,
    timer.startedAt,
  );
  TestValidator.equals(
    "discarded timer should preserve createdAt",
    discarded.createdAt,
    timer.createdAt,
  );
  TestValidator.equals(
    "discarded timer should preserve project",
    discarded.project,
    timer.project,
  );
  TestValidator.equals(
    "discarded timer should preserve task",
    discarded.task,
    timer.task,
  );
  TestValidator.equals(
    "discarded timer should preserve description",
    discarded.description,
    timer.description,
  );
  TestValidator.predicate(
    "discarded timer should be marked deleted",
    discarded.deletedAt !== null,
  );
  TestValidator.notEquals(
    "discarded timer should no longer be active",
    discarded.deletedAt,
    timer.deletedAt,
  );
}
