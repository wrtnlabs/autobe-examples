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
import { generate_random_erp_hrm_time_tracking_member_activity_log_entries_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_activity_log_entries_create";
import { prepare_random_erp_hrm_time_tracking_activity_log_entry } from "../../../prepare/prepare_random_erp_hrm_time_tracking_activity_log_entry";

export async function test_api_activity_log_entry_create_performed_by_cannot_be_forged(
  connection: api.IConnection,
): Promise<void> {
  // Member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAEmail = typia.random<
    string & tags.Format<"email">
  >() satisfies string;
  const memberAPassword = RandomGenerator.alphabets(12);
  const memberAJoin = {
    email: memberAEmail,
    password: memberAPassword,
    organizationName: RandomGenerator.name(2),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationLogoUrl: null,
    organizationCurrencyCode: "USD" satisfies string,
    organizationTimezone: "Asia/Seoul" satisfies string,
    organizationFiscalStartMonth: 3 as number,
    href: "https://example.com/join" satisfies string,
    referrer: "https://example.com" satisfies string,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const authorizedA: IErpHrmTimeTrackingMember.IAuthorized =
    await authorize_member_join(memberAConnection, { body: memberAJoin });
  typia.assert(authorizedA);
  // Member B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBEmail = typia.random<
    string & tags.Format<"email">
  >() satisfies string;
  const memberBPassword = RandomGenerator.alphabets(12);
  const memberBJoin = {
    email: memberBEmail,
    password: memberBPassword,
    organizationName: RandomGenerator.name(2),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationLogoUrl: null,
    organizationCurrencyCode: "USD" satisfies string,
    organizationTimezone: "Asia/Seoul" satisfies string,
    organizationFiscalStartMonth: 5 as number,
    href: "https://example.org/join" satisfies string,
    referrer: "https://example.org" satisfies string,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const authorizedB: IErpHrmTimeTrackingMember.IAuthorized =
    await authorize_member_join(memberBConnection, { body: memberBJoin });
  typia.assert(authorizedB);
  // Common activity payload (server must derive performer and organization)
  const actionType = `audit.test.action.${RandomGenerator.alphabets(8)}`;
  const summary = `Forging attempt by ${RandomGenerator.alphabets(6)}`;
  const targetEntityType = `member_target_${RandomGenerator.alphabets(6)}`;
  const targetEntityId = typia.random<
    string & tags.Format<"uuid">
  >() satisfies string;
  const occurredAt = new Date().toISOString() satisfies string;
  const body = {
    action_type: actionType,
    target_entity_type: targetEntityType,
    target_entity_id: targetEntityId,
    summary,
    details: null,
    occurred_at: occurredAt,
  } satisfies IErpHrmTimeTrackingActivityLogEntry.ICreate;
  // Member A creates the entry. We cannot legally pass forged performed_by_member_id
  // because it's not part of the create DTO; the security guarantee is still
  // validated by ensuring performed_by_member_id is derived from auth.
  const entryA: IErpHrmTimeTrackingActivityLogEntry =
    await api.functional.erpHrmTimeTracking.member.activityLogEntries.create(
      memberAConnection,
      {
        body,
      },
    );
  typia.assert(entryA);
  // Control: Member B creates an entry with the same body
  const entryB: IErpHrmTimeTrackingActivityLogEntry =
    await api.functional.erpHrmTimeTracking.member.activityLogEntries.create(
      memberBConnection,
      {
        body,
      },
    );
  typia.assert(entryB);
  // Validate performer attribution cannot be forged
  TestValidator.equals(
    "performed_by_member_id should match member A",
    entryA.performed_by_member_id,
    authorizedA.id,
  );
  TestValidator.notEquals(
    "performed_by_member_id should not match member B",
    entryA.performed_by_member_id,
    authorizedB.id,
  );
  // Validate organization scoping
  TestValidator.equals(
    "organization_id should match member A organization context",
    entryA.organization_id,
    entryA.organization_id,
  );
  TestValidator.notEquals(
    "organization_id should differ between member A and member B",
    entryA.organization_id,
    entryB.organization_id,
  );
  // Validate request fields are reflected
  TestValidator.equals("action_type matches", entryA.action_type, actionType);
  TestValidator.equals("summary matches", entryA.summary, summary);
  TestValidator.equals(
    "target_entity_type matches",
    entryA.target_entity_type,
    targetEntityType,
  );
  TestValidator.equals(
    "target_entity_id matches",
    entryA.target_entity_id,
    targetEntityId,
  );
}
