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

export async function test_api_timer_get_organization_context_isolation(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const outsiderConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password1234!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding/owner",
      referrer: "https://example.com/referrer/owner",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(owner);
  const outsider = await authorize_member_join(outsiderConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password1234!",
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding/outsider",
      referrer: "https://example.com/referrer/outsider",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(outsider);
  const ownerScopedConnection: api.IConnection = { host: connection.host };
  ownerScopedConnection.headers = {
    Authorization: owner.token.access,
  };
  const outsiderScopedConnection: api.IConnection = { host: connection.host };
  outsiderScopedConnection.headers = {
    Authorization: outsider.token.access,
  };
  const createdTimer = await generate_random_erp_hrm_time_member_timers_create(
    ownerScopedConnection,
    {
      body: {
        project_id: typia.random<string & tags.Format<"uuid">>(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IErpHrmTimeTimer.ICreate,
    },
  );
  typia.assert(createdTimer);
  const fetchedTimer = await api.functional.erpHrmTime.member.timers.get(
    ownerScopedConnection,
  );
  typia.assert(fetchedTimer);
  TestValidator.equals(
    "owning organization context should return the active timer",
    fetchedTimer.id,
    createdTimer.id,
  );
  await TestValidator.httpError(
    "a different organization context should not expose the timer",
    [404, 409],
    async () => {
      await api.functional.erpHrmTime.member.timers.get(
        outsiderScopedConnection,
      );
    },
  );
  TestValidator.notEquals(
    "timer visibility must depend on the selected organization context",
    fetchedTimer.id,
    outsider.token.access,
  );
}
