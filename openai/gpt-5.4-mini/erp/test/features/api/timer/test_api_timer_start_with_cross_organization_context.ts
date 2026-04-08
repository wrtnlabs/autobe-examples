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

export async function test_api_timer_start_with_cross_organization_context(
  connection: api.IConnection,
): Promise<void> {
  const memberConnectionA: api.IConnection = { host: connection.host };
  const joinedA = await authorize_member_join(memberConnectionA, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(joinedA);
  const memberConnectionB: api.IConnection = { host: connection.host };
  const joinedB = await authorize_member_join(memberConnectionB, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(joinedB);
  await TestValidator.httpError(
    "timer creation with a project from another organization should fail",
    [400, 401, 403, 404, 409, 422],
    async () => {
      await api.functional.erpHrmTime.member.timers.create(memberConnectionA, {
        body: {
          project_id: typia.random<string & tags.Format<"uuid">>(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IErpHrmTimeTimer.ICreate,
      });
    },
  );
  await TestValidator.httpError(
    "timer creation with a task that does not belong to the selected project should fail",
    [400, 401, 403, 404, 409, 422],
    async () => {
      await api.functional.erpHrmTime.member.timers.create(memberConnectionB, {
        body: {
          project_id: typia.random<string & tags.Format<"uuid">>(),
          task_id: typia.random<string & tags.Format<"uuid">>(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IErpHrmTimeTimer.ICreate,
      });
    },
  );
}
