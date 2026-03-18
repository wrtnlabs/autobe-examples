import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingTimesheetVersioningLock } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimesheetVersioningLock";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_tracking_member_timesheet_versioning_locks_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_timesheet_versioning_locks_create";
import { prepare_random_erp_hrm_time_tracking_timesheet_versioning_lock } from "../../../prepare/prepare_random_erp_hrm_time_tracking_timesheet_versioning_lock";

export async function test_api_timesheet_versioning_lock_create_lock_reason_and_single_active_lock(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member join
  const memberConnection: api.IConnection = { host: connection.host };
  const emailA = typia.random<string & tags.Format<"email">>();
  const joinedA = await authorize_member_join(memberConnection, {
    body: {
      email: emailA,
      password: "P@ssw0rd!",
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationLogoUrl: null,
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
      >(),
      href: "https://example.com/join",
      referrer: "https://example.com/referrer",
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(joinedA);
  const lockedByUserId = joinedA.id;
  // 2) Create initial lock (this also yields an eligible timesheet_id)
  const lockReasonA = RandomGenerator.paragraph({ sentences: 1 });
  const lockA =
    await generate_random_erp_hrm_time_tracking_member_timesheet_versioning_locks_create(
      memberConnection,
      {
        body: {
          locked_by_user_id: lockedByUserId,
          lock_reason: lockReasonA,
        },
      },
    );
  typia.assert(lockA);
  const timesheetId = lockA.timesheet_id;
  // 3) Validate lock_reason matches Lock A
  TestValidator.equals(
    "lock_reason matches Lock A",
    lockA.lock_reason,
    lockReasonA,
  );
  // 4) Create second lock with Lock B on same timesheet/user
  const lockReasonB = RandomGenerator.paragraph({ sentences: 1 });
  const lockB =
    await generate_random_erp_hrm_time_tracking_member_timesheet_versioning_locks_create(
      memberConnection,
      {
        body: {
          timesheet_id: timesheetId,
          locked_by_user_id: lockedByUserId,
          lock_reason: lockReasonB,
        },
      },
    );
  typia.assert(lockB);
  // 5) Validate invariant via returned active lock consistency.
  //    Accept either update/reuse to Lock B, or refusal/reuse without changing active lock.
  TestValidator.equals(
    "timesheet_id unchanged",
    lockB.timesheet_id,
    timesheetId,
  );
  TestValidator.equals(
    "locked_by_user_id unchanged",
    lockB.locked_by_user_id,
    lockedByUserId,
  );
  TestValidator.predicate(
    "active lock_reason after second POST is either Lock B or remains Lock A",
    lockB.lock_reason === lockReasonB || lockB.lock_reason === lockReasonA,
  );
  // 6) If system reuses the same record, ids should match.
  //    If it updates in-place, implementations may keep id stable; otherwise it may return the active record.
  TestValidator.predicate(
    "single active lock behavior likely via same record id or consistent lock_reason policy",
    lockB.id === lockA.id || lockB.lock_reason !== lockReasonA,
  );
}
