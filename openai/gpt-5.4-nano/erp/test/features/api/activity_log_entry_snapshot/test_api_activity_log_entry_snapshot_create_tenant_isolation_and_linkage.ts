import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingActivityLogEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingActivityLogEntry";
import type { IErpHrmTimeTrackingActivityLogEntrySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingActivityLogEntrySnapshot";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
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

export async function test_api_activity_log_entry_snapshot_create_tenant_isolation_and_linkage(
  connection: api.IConnection,
): Promise<void> {
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAOrgAName: string = `org-a-${RandomGenerator.alphabets(10)}`;
  const memberAAuthorized = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      organizationName: memberAOrgAName,
      organizationDescription: RandomGenerator.paragraph({ sentences: 1 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/join",
      referrer: "https://example.com/ref",
      ip: null,
    },
  });
  TestValidator.predicate(
    "member A should be authorized",
    memberAAuthorized.id.length > 0,
  );
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBOrgBName: string = `org-b-${RandomGenerator.alphabets(10)}`;
  const memberBAuthorized = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      organizationName: memberBOrgBName,
      organizationDescription: RandomGenerator.paragraph({ sentences: 1 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/join",
      referrer: "https://example.com/ref",
      ip: null,
    },
  });
  TestValidator.predicate(
    "member B should be authorized",
    memberBAuthorized.id.length > 0,
  );
  // Scenario 1: organization isolation
  const activityLogEntryA =
    await generate_random_erp_hrm_time_tracking_member_activity_log_entries_create(
      memberAConnection,
      {},
    );
  typia.assert(activityLogEntryA);
  const activityLogEntryB =
    await generate_random_erp_hrm_time_tracking_member_activity_log_entries_create(
      memberBConnection,
      {},
    );
  typia.assert(activityLogEntryB);
  const snapshotBodyIsolation = {
    erpHrmTimeTrackingActivityLogEntryId:
      activityLogEntryA.id satisfies string & tags.Format<"uuid">,
    erpHrmTimeTrackingOrganizationId:
      activityLogEntryB.organization_id satisfies string & tags.Format<"uuid">,
    snapshotActionType: activityLogEntryA.action_type,
    snapshotActionSummary: activityLogEntryA.summary,
    performerType: "member",
    performerId: activityLogEntryB.performed_by_member_id,
    targetEntityType: activityLogEntryA.target_entity_type,
    targetEntityId: activityLogEntryA.target_entity_id,
    targetAdditionalInfo: null,
  } satisfies IErpHrmTimeTrackingActivityLogEntrySnapshot.ICreate;
  await TestValidator.error(
    "tenant isolation should reject snapshot creation referencing activity log entry from another organization",
    async () => {
      await generate_random_erp_hrm_time_tracking_member_activity_log_entry_snapshots_create(
        memberBConnection,
        {
          body: snapshotBodyIsolation,
        },
      );
    },
  );
  // Scenario 2: linkage consistency
  const activityLogEntryA2 =
    await generate_random_erp_hrm_time_tracking_member_activity_log_entries_create(
      memberAConnection,
      {},
    );
  typia.assert(activityLogEntryA2);
  const inconsistentSnapshotBody = {
    erpHrmTimeTrackingActivityLogEntryId:
      activityLogEntryA2.id satisfies string & tags.Format<"uuid">,
    erpHrmTimeTrackingOrganizationId:
      activityLogEntryA2.organization_id satisfies string & tags.Format<"uuid">,
    snapshotActionType: activityLogEntryA2.action_type,
    snapshotActionSummary: activityLogEntryA2.summary,
    performerType: "member",
    performerId: typia.random<string & tags.Format<"uuid">>() as string &
      tags.Format<"uuid">,
    targetEntityType: RandomGenerator.pick([
      "other_entity_type_1",
      "other_entity_type_2",
      "other_entity_type_3",
    ]),
    targetEntityId: typia.random<string & tags.Format<"uuid">>() as string &
      tags.Format<"uuid">,
    targetAdditionalInfo: null,
  } satisfies IErpHrmTimeTrackingActivityLogEntrySnapshot.ICreate;
  await TestValidator.error(
    "linkage mismatch should reject snapshot creation when performer/target do not match referenced activity log entry",
    async () => {
      await generate_random_erp_hrm_time_tracking_member_activity_log_entry_snapshots_create(
        memberAConnection,
        {
          body: inconsistentSnapshotBody,
        },
      );
    },
  );
  // Scenario 3: targetAdditionalInfo can be null (should succeed)
  const activityLogEntryA3 =
    await generate_random_erp_hrm_time_tracking_member_activity_log_entries_create(
      memberAConnection,
      {},
    );
  typia.assert(activityLogEntryA3);
  const snapshotBodyNullInfo = {
    erpHrmTimeTrackingActivityLogEntryId:
      activityLogEntryA3.id satisfies string & tags.Format<"uuid">,
    erpHrmTimeTrackingOrganizationId:
      activityLogEntryA3.organization_id satisfies string & tags.Format<"uuid">,
    snapshotActionType: activityLogEntryA3.action_type,
    snapshotActionSummary: activityLogEntryA3.summary,
    performerType: "member",
    performerId: activityLogEntryA3.performed_by_member_id satisfies string &
      tags.Format<"uuid">,
    targetEntityType: activityLogEntryA3.target_entity_type,
    targetEntityId: activityLogEntryA3.target_entity_id,
    targetAdditionalInfo: null,
  } satisfies IErpHrmTimeTrackingActivityLogEntrySnapshot.ICreate;
  const snapshot =
    await generate_random_erp_hrm_time_tracking_member_activity_log_entry_snapshots_create(
      memberAConnection,
      { body: snapshotBodyNullInfo },
    );
  typia.assert(snapshot);
  TestValidator.equals(
    "targetAdditionalInfo should be null",
    snapshot.targetAdditionalInfo,
    null,
  );
  TestValidator.equals(
    "snapshot should keep linkage to referenced activity log entry",
    snapshot.erpHrmTimeTrackingActivityLogEntryId,
    activityLogEntryA3.id,
  );
  TestValidator.equals(
    "snapshot should keep organization",
    snapshot.erpHrmTimeTrackingOrganizationId,
    activityLogEntryA3.organization_id,
  );
  TestValidator.equals(
    "snapshot should keep action type",
    snapshot.snapshotActionType,
    activityLogEntryA3.action_type,
  );
  TestValidator.equals(
    "snapshot should keep action summary",
    snapshot.snapshotActionSummary,
    activityLogEntryA3.summary,
  );
  TestValidator.equals(
    "snapshot should keep performer id",
    snapshot.performerId,
    activityLogEntryA3.performed_by_member_id,
  );
  TestValidator.equals(
    "snapshot should keep target entity type",
    snapshot.targetEntityType,
    activityLogEntryA3.target_entity_type,
  );
  TestValidator.equals(
    "snapshot should keep target entity id",
    snapshot.targetEntityId,
    activityLogEntryA3.target_entity_id,
  );
}
