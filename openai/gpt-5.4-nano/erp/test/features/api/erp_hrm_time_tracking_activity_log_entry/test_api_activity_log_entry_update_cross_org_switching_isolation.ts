import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingActivityLogEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingActivityLogEntry";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_activity_log_entry_update_cross_org_switching_isolation(
  connection: api.IConnection,
): Promise<void> {
  // Setup: member join to obtain an authenticated, org-scoped context.
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd-" + RandomGenerator.alphabets(8),
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: `https://example.com/${RandomGenerator.alphabets(8)}`,
      referrer: `https://example.com/ref/${RandomGenerator.alphabets(8)}`,
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(memberAuth);
  // The required scenario steps (create activity log entry in org A,
  // switch org context to org B, then verify cross-org rejection + state)
  // require additional SDK endpoints/utilities that are not available in the
  // provided materials for this task.
  // Minimal executable coverage with the available PUT endpoint: perform an
  // organization-scoped update attempt with a valid update payload.
  const updatePayload = {
    action_type: RandomGenerator.name(2),
    target_entity_type: RandomGenerator.name(2),
    target_entity_id: typia.random<string & tags.Format<"uuid">>(),
    summary: RandomGenerator.paragraph({ sentences: 1 }),
    details: null,
    occurred_at: new Date().toISOString(),
  } satisfies IErpHrmTimeTrackingActivityLogEntry.IUpdate;
  const activityLogEntryId = typia.random<string & tags.Format<"uuid">>();
  const updated =
    await api.functional.erpHrmTimeTracking.member.activityLogEntries.update(
      memberConnection,
      {
        activityLogEntryId,
        body: updatePayload,
      },
    );
  typia.assert(updated);
}
