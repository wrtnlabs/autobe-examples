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

export async function test_api_activity_log_entry_update_success_and_isolation(
  connection: api.IConnection,
): Promise<void> {
  // Member join for organization A
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd!",
      organizationName: `org-${RandomGenerator.alphabets(10)}`,
      organizationDescription: RandomGenerator.paragraph({ sentences: 1 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/join" satisfies string & tags.Format<"uri">,
      referrer: "https://example.com/ref" satisfies string & tags.Format<"uri">,
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  const activityLogEntryIdA = typia.random<string & tags.Format<"uuid">>();
  const targetEntityIdA = typia.random<string & tags.Format<"uuid">>();
  const updatePayload1 = {
    action_type: `action-${RandomGenerator.alphabets(8)}`,
    target_entity_type: "member",
    target_entity_id: targetEntityIdA,
    summary: RandomGenerator.paragraph({ sentences: 1 }),
    details: RandomGenerator.paragraph({ sentences: 2 }),
    occurred_at: new Date().toISOString(),
  } satisfies IErpHrmTimeTrackingActivityLogEntry.IUpdate;
  const updatedA1 =
    await api.functional.erpHrmTimeTracking.member.activityLogEntries.update(
      memberAConnection,
      {
        activityLogEntryId: activityLogEntryIdA,
        body: updatePayload1,
      },
    );
  typia.assert(updatedA1);
  TestValidator.equals(
    "updated id matches path",
    updatedA1.id,
    activityLogEntryIdA,
  );
  TestValidator.equals(
    "action_type updated",
    updatedA1.action_type,
    updatePayload1.action_type,
  );
  TestValidator.equals(
    "target_entity_type updated",
    updatedA1.target_entity_type,
    updatePayload1.target_entity_type,
  );
  TestValidator.equals(
    "target_entity_id updated",
    updatedA1.target_entity_id,
    updatePayload1.target_entity_id,
  );
  TestValidator.equals(
    "summary updated",
    updatedA1.summary,
    updatePayload1.summary,
  );
  TestValidator.equals(
    "details updated",
    updatedA1.details,
    updatePayload1.details,
  );
  TestValidator.equals(
    "occurred_at updated",
    updatedA1.occurred_at,
    updatePayload1.occurred_at,
  );
  // Edge validation: details explicitly null
  const updatePayload2 = {
    action_type: `action-${RandomGenerator.alphabets(8)}`,
    target_entity_type: updatePayload1.target_entity_type,
    target_entity_id: updatePayload1.target_entity_id,
    summary: RandomGenerator.paragraph({ sentences: 1 }),
    details: null,
    occurred_at: new Date(Date.now() + 60000).toISOString(),
  } satisfies IErpHrmTimeTrackingActivityLogEntry.IUpdate;
  const updatedA2 =
    await api.functional.erpHrmTimeTracking.member.activityLogEntries.update(
      memberAConnection,
      {
        activityLogEntryId: activityLogEntryIdA,
        body: updatePayload2,
      },
    );
  typia.assert(updatedA2);
  TestValidator.equals("id stable", updatedA2.id, activityLogEntryIdA);
  TestValidator.equals(
    "organization_id stable",
    updatedA2.organization_id,
    updatedA1.organization_id,
  );
  TestValidator.equals(
    "performed_by_member_id stable",
    updatedA2.performed_by_member_id,
    updatedA1.performed_by_member_id,
  );
  TestValidator.equals(
    "action_type updated",
    updatedA2.action_type,
    updatePayload2.action_type,
  );
  TestValidator.equals(
    "target_entity_type updated",
    updatedA2.target_entity_type,
    updatePayload2.target_entity_type,
  );
  TestValidator.equals(
    "target_entity_id updated",
    updatedA2.target_entity_id,
    updatePayload2.target_entity_id,
  );
  TestValidator.equals(
    "summary updated",
    updatedA2.summary,
    updatePayload2.summary,
  );
  TestValidator.equals("details null accepted", updatedA2.details, null);
  TestValidator.equals(
    "occurred_at updated",
    updatedA2.occurred_at,
    updatePayload2.occurred_at,
  );
  // Tenant isolation: member from org B cannot update org A's entry
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd!",
      organizationName: `org-${RandomGenerator.alphabets(10)}`,
      organizationDescription: RandomGenerator.paragraph({ sentences: 1 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/join" satisfies string & tags.Format<"uri">,
      referrer: "https://example.com/ref" satisfies string & tags.Format<"uri">,
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  const updatePayloadB = {
    action_type: `action-${RandomGenerator.alphabets(8)}`,
    target_entity_type: updatePayload1.target_entity_type,
    target_entity_id: updatePayload1.target_entity_id,
    summary: RandomGenerator.paragraph({ sentences: 1 }),
    details: RandomGenerator.paragraph({ sentences: 1 }),
    occurred_at: new Date(Date.now() + 120000).toISOString(),
  } satisfies IErpHrmTimeTrackingActivityLogEntry.IUpdate;
  await TestValidator.error(
    "tenant isolation rejects update in other organization",
    async () => {
      await api.functional.erpHrmTimeTracking.member.activityLogEntries.update(
        memberBConnection,
        {
          activityLogEntryId: activityLogEntryIdA,
          body: updatePayloadB,
        },
      );
    },
  );
}
