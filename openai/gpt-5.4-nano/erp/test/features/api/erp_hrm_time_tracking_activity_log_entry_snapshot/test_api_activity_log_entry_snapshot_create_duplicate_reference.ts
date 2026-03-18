import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingActivityLogEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingActivityLogEntry";
import type { IErpHrmTimeTrackingActivityLogEntrySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingActivityLogEntrySnapshot";
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
import { generate_random_erp_hrm_time_tracking_member_activity_log_entry_snapshots_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_activity_log_entry_snapshots_create";
import { prepare_random_erp_hrm_time_tracking_activity_log_entry } from "../../../prepare/prepare_random_erp_hrm_time_tracking_activity_log_entry";
import { prepare_random_erp_hrm_time_tracking_activity_log_entry_snapshot } from "../../../prepare/prepare_random_erp_hrm_time_tracking_activity_log_entry_snapshot";

export async function test_api_activity_log_entry_snapshot_create_duplicate_reference(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member join (create actor-specific connection)
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = `P@ss-${typia.random<string & tags.Format<"uuid">>().slice(0, 8)}`;
  const organizationName = `org-${RandomGenerator.alphabets(10)}`;
  const organizationDescription = RandomGenerator.paragraph({ sentences: 1 });
  const href = `https://example.com/${RandomGenerator.alphabets(8)}` as string;
  const referrer =
    `https://example.com/ref/${RandomGenerator.alphabets(8)}` as string;
  await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      organizationName,
      organizationDescription,
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: href satisfies string & tags.Format<"uri">,
      referrer: referrer satisfies string & tags.Format<"uri">,
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  // 2) Create ActivityLogEntry using generator utility
  const actionType = `action.${RandomGenerator.alphabets(8)}`;
  const targetEntityType = `entity.${RandomGenerator.alphabets(6)}`;
  const targetEntityId = typia.random<string & tags.Format<"uuid">>();
  const summary = RandomGenerator.paragraph({ sentences: 1 });
  const details = null;
  const occurredAt = new Date().toISOString();
  const activityLogEntry =
    await generate_random_erp_hrm_time_tracking_member_activity_log_entries_create(
      memberConnection,
      {
        body: {
          action_type: actionType,
          target_entity_type: targetEntityType,
          target_entity_id: targetEntityId,
          summary,
          details,
          occurred_at: occurredAt,
        } satisfies IErpHrmTimeTrackingActivityLogEntry.ICreate,
      },
    );
  typia.assert(activityLogEntry);
  // 3) Create snapshots twice for the same referenced ActivityLogEntry using generator utility
  const snapshot1 =
    await generate_random_erp_hrm_time_tracking_member_activity_log_entry_snapshots_create(
      memberConnection,
      {
        body: {
          erpHrmTimeTrackingActivityLogEntryId: activityLogEntry.id,
          erpHrmTimeTrackingOrganizationId: activityLogEntry.organization_id,
        } satisfies DeepPartial<IErpHrmTimeTrackingActivityLogEntrySnapshot.ICreate>,
      },
    );
  typia.assert(snapshot1);
  // Ensure second call is created separately
  await new Promise((resolve) => setTimeout(resolve, 10));
  const snapshot2 =
    await generate_random_erp_hrm_time_tracking_member_activity_log_entry_snapshots_create(
      memberConnection,
      {
        body: {
          erpHrmTimeTrackingActivityLogEntryId: activityLogEntry.id,
          erpHrmTimeTrackingOrganizationId: activityLogEntry.organization_id,
        } satisfies DeepPartial<IErpHrmTimeTrackingActivityLogEntrySnapshot.ICreate>,
      },
    );
  typia.assert(snapshot2);
  // 4) Validate distinct snapshot ids
  TestValidator.notEquals(
    "snapshot ids should differ",
    snapshot1.id,
    snapshot2.id,
  );
  // 5) Validate both reference the same activity log entry and organization
  TestValidator.equals(
    "referenced activity log entry id matches (1)",
    snapshot1.erpHrmTimeTrackingActivityLogEntryId,
    activityLogEntry.id,
  );
  TestValidator.equals(
    "referenced activity log entry id matches (2)",
    snapshot2.erpHrmTimeTrackingActivityLogEntryId,
    activityLogEntry.id,
  );
  TestValidator.equals(
    "snapshot1 organization id matches",
    snapshot1.erpHrmTimeTrackingOrganizationId,
    activityLogEntry.organization_id,
  );
  TestValidator.equals(
    "snapshot2 organization id matches",
    snapshot2.erpHrmTimeTrackingOrganizationId,
    activityLogEntry.organization_id,
  );
  // 6) Validate timestamps and soft deletion semantics
  TestValidator.equals(
    "snapshot1 deletedAt is null",
    snapshot1.deletedAt,
    null,
  );
  TestValidator.equals(
    "snapshot2 deletedAt is null",
    snapshot2.deletedAt,
    null,
  );
  TestValidator.predicate(
    "snapshot1 createdAt <= snapshot2 createdAt",
    () => snapshot1.createdAt <= snapshot2.createdAt,
  );
  TestValidator.predicate(
    "snapshot1 updatedAt <= snapshot2 updatedAt",
    () => snapshot1.updatedAt <= snapshot2.updatedAt,
  );
}
