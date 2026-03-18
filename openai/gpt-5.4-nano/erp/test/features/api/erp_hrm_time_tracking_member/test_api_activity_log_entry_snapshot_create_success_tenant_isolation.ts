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

export async function test_api_activity_log_entry_snapshot_create_success_tenant_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as a member to obtain authorization and establish an
  // organization context.
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized: IErpHrmTimeTrackingMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        organizationName: RandomGenerator.name(),
        organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
        organizationCurrencyCode: RandomGenerator.pick([
          "USD",
          "KRW",
          "EUR",
          "JPY",
        ] as const),
        organizationTimezone: "Asia/Seoul",
        organizationFiscalStartMonth: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
        >() satisfies number,
        href: "https://example.com/join" satisfies string & tags.Format<"uri">,
        referrer: "https://example.com/ref" satisfies string &
          tags.Format<"uri">,
        ip: null,
      } satisfies IErpHrmTimeTrackingMember.IJoin,
    });
  // Ensure connection is authorized for subsequent API calls.
  memberConnection.headers ??= {};
  memberConnection.headers.Authorization = memberAuthorized.token.access;
  // 2) Create an ActivityLogEntry within the same organization context.
  const activityLogEntry =
    await generate_random_erp_hrm_time_tracking_member_activity_log_entries_create(
      memberConnection,
      {
        body: {
          action_type: RandomGenerator.pick([
            "clock_in",
            "clock_out",
            "timesheet_update",
          ] as const),
          target_entity_type: RandomGenerator.pick([
            "timesheet",
            "shift",
            "project",
          ] as const),
          target_entity_id: typia.random<string & tags.Format<"uuid">>(),
          summary: RandomGenerator.paragraph({ sentences: 1 }),
          details: null,
          occurred_at: new Date().toISOString(),
        } satisfies IErpHrmTimeTrackingActivityLogEntry.ICreate,
      },
    );
  typia.assert(activityLogEntry);
  // 3) Create an ActivityLogEntrySnapshot referencing that entry and using
  // the same organization id.
  const snapshotRequest: IErpHrmTimeTrackingActivityLogEntrySnapshot.ICreate = {
    erpHrmTimeTrackingActivityLogEntryId: activityLogEntry.id,
    erpHrmTimeTrackingOrganizationId: activityLogEntry.organization_id,
    snapshotActionType: activityLogEntry.action_type,
    snapshotActionSummary: activityLogEntry.summary,
    performerType: "member",
    performerId: activityLogEntry.performed_by_member_id,
    targetEntityType: activityLogEntry.target_entity_type,
    targetEntityId: activityLogEntry.target_entity_id,
    targetAdditionalInfo: activityLogEntry.details,
  } satisfies IErpHrmTimeTrackingActivityLogEntrySnapshot.ICreate;
  const snapshot =
    await generate_random_erp_hrm_time_tracking_member_activity_log_entry_snapshots_create(
      memberConnection,
      {
        body: snapshotRequest,
      },
    );
  typia.assert(snapshot);
  // 4) Validate response fields match request.
  TestValidator.equals(
    "snapshot erpHrmTimeTrackingActivityLogEntryId matches",
    snapshot.erpHrmTimeTrackingActivityLogEntryId,
    snapshotRequest.erpHrmTimeTrackingActivityLogEntryId,
  );
  TestValidator.equals(
    "snapshot erpHrmTimeTrackingOrganizationId matches",
    snapshot.erpHrmTimeTrackingOrganizationId,
    snapshotRequest.erpHrmTimeTrackingOrganizationId,
  );
  TestValidator.equals(
    "snapshotActionType matches",
    snapshot.snapshotActionType,
    snapshotRequest.snapshotActionType,
  );
  TestValidator.equals(
    "snapshotActionSummary matches",
    snapshot.snapshotActionSummary,
    snapshotRequest.snapshotActionSummary,
  );
  TestValidator.equals(
    "performerType matches",
    snapshot.performerType,
    snapshotRequest.performerType,
  );
  TestValidator.equals(
    "performerId matches",
    snapshot.performerId,
    snapshotRequest.performerId,
  );
  TestValidator.equals(
    "targetEntityType matches",
    snapshot.targetEntityType,
    snapshotRequest.targetEntityType,
  );
  TestValidator.equals(
    "targetEntityId matches",
    snapshot.targetEntityId,
    snapshotRequest.targetEntityId,
  );
  TestValidator.equals(
    "targetAdditionalInfo matches",
    snapshot.targetAdditionalInfo,
    snapshotRequest.targetAdditionalInfo,
  );
  const createdAt = new Date(snapshot.createdAt).getTime();
  const updatedAt = new Date(snapshot.updatedAt).getTime();
  TestValidator.predicate("updatedAt >= createdAt", updatedAt >= createdAt);
  TestValidator.equals("deletedAt is null", snapshot.deletedAt, null);
  // 5) Tenant isolation: snapshot organization must match the activity log
  // entry organization (same as authenticated member context).
  TestValidator.equals(
    "tenant isolation organization matches activity log entry",
    snapshot.erpHrmTimeTrackingOrganizationId,
    activityLogEntry.organization_id,
  );
}
