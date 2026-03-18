import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_erp_hrm_time_tracking_member_activity_log_entry_snapshots_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_activity_log_entry_snapshots_create";
import { prepare_random_erp_hrm_time_tracking_activity_log_entry_snapshot } from "../../../prepare/prepare_random_erp_hrm_time_tracking_activity_log_entry_snapshot";

export async function test_api_activity_log_entry_snapshot_immutability_point_in_time(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join as a member within an organization.
  const memberConnection: api.IConnection = { host: connection.host };
  const memberCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string>(),
    organizationName: RandomGenerator.name(),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationLogoUrl: null,
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
    href: "https://example.com/join" satisfies string & tags.Format<"uri">,
    referrer: "https://example.com/ref" satisfies string & tags.Format<"uri">,
    ip: undefined,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  await authorize_member_join(memberConnection, {
    body: memberCredentials,
  });
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = memberConnection.headers;
  // 2) Create a snapshot.
  const snapshot =
    await generate_random_erp_hrm_time_tracking_member_activity_log_entry_snapshots_create(
      userConnection,
      {},
    );
  typia.assert(snapshot);
  const snapshotId = snapshot.id;
  const original = {
    snapshotActionType: snapshot.snapshotActionType,
    snapshotActionSummary: snapshot.snapshotActionSummary,
    performerType: snapshot.performerType,
    performerId: snapshot.performerId,
    targetEntityType: snapshot.targetEntityType,
    targetEntityId: snapshot.targetEntityId,
    targetAdditionalInfo: snapshot.targetAdditionalInfo,
    erpHrmTimeTrackingActivityLogEntryId:
      snapshot.erpHrmTimeTrackingActivityLogEntryId,
  };
  // 3) Trigger later audit activity (available harness creates another snapshot).
  await generate_random_erp_hrm_time_tracking_member_activity_log_entry_snapshots_create(
    userConnection,
    {},
  );
  // 4) Read snapshot again.
  const fetched =
    await api.functional.erpHrmTimeTracking.member.activityLogEntrySnapshots.at(
      userConnection,
      {
        activityLogEntrySnapshotId: snapshotId,
      },
    );
  typia.assert(fetched);
  // 5) Validate immutability / point-in-time consistency.
  TestValidator.equals(
    "snapshotActionType unchanged",
    fetched.snapshotActionType,
    original.snapshotActionType,
  );
  TestValidator.equals(
    "snapshotActionSummary unchanged",
    fetched.snapshotActionSummary,
    original.snapshotActionSummary,
  );
  TestValidator.equals(
    "performerType unchanged",
    fetched.performerType,
    original.performerType,
  );
  TestValidator.equals(
    "performerId unchanged",
    fetched.performerId,
    original.performerId,
  );
  TestValidator.equals(
    "targetEntityType unchanged",
    fetched.targetEntityType,
    original.targetEntityType,
  );
  TestValidator.equals(
    "targetEntityId unchanged",
    fetched.targetEntityId,
    original.targetEntityId,
  );
  TestValidator.equals(
    "targetAdditionalInfo unchanged",
    fetched.targetAdditionalInfo,
    original.targetAdditionalInfo,
  );
  TestValidator.equals(
    "parent activity log entry id unchanged",
    fetched.erpHrmTimeTrackingActivityLogEntryId,
    original.erpHrmTimeTrackingActivityLogEntryId,
  );
  TestValidator.equals("snapshot id same", fetched.id, snapshotId);
}
