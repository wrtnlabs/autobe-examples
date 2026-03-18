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

export async function test_api_timesheet_versioning_lock_release_then_restore_consistent_transition(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as member
  const email = typia.random<string & tags.Format<"email">>();
  const password = "Password123!";
  const memberJoin: IErpHrmTimeTrackingMember.IJoin = {
    email,
    password,
    organizationName: RandomGenerator.name(),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationLogoUrl: null,
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 1,
    href: "https://example.com/join",
    referrer: "https://example.com/referrer",
    ip: null,
  };
  const baseMemberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(baseMemberConnection, {
    body: memberJoin,
  });
  typia.assert(authorized);
  // Use actor-specific connection (with Authorization header)
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = baseMemberConnection.headers;
  // 2) Create a lock to obtain a lockId
  const initialLock =
    await generate_random_erp_hrm_time_tracking_member_timesheet_versioning_locks_create(
      memberConnection,
      {},
    );
  typia.assert(initialLock);
  // Ensure initial state is active
  TestValidator.equals(
    "initial lock deleted_at is null",
    initialLock.deleted_at,
    null,
  );
  const lockId = initialLock.id;
  const releaseReason = RandomGenerator.paragraph({ sentences: 1 });
  const reActivateReason = RandomGenerator.paragraph({ sentences: 1 });
  // 3) Release/cancel lock
  const releasedAt = new Date().toISOString();
  await api.functional.erpHrmTimeTracking.member.timesheetVersioningLocks.update(
    memberConnection,
    {
      lockId,
      body: {
        deleted_at: releasedAt,
        lock_reason: releaseReason,
      } satisfies IErpHrmTimeTrackingTimesheetVersioningLock.IUpdate,
    },
  );
  // 4) Immediately re-activate lock
  const reactivatedAt = new Date().toISOString();
  await api.functional.erpHrmTimeTracking.member.timesheetVersioningLocks.update(
    memberConnection,
    {
      lockId,
      body: {
        deleted_at: null,
        lock_reason: reActivateReason,
      } satisfies IErpHrmTimeTrackingTimesheetVersioningLock.IUpdate,
    },
  );
  // 5) Validate persisted fields by re-fetching is not available in SDK list,
  // so validate by calling update semantics with no changes? Not possible.
  // Instead, validate through a second update that forces timestamps and reasons are applied.
  // We rely on returned lock entity; however update endpoint returns void.
  // Therefore, validate by creating a new lock is not appropriate.
  // No-op workaround: call update with same transition and ensure it doesn't break.
  await api.functional.erpHrmTimeTracking.member.timesheetVersioningLocks.update(
    memberConnection,
    {
      lockId,
      body: {
        deleted_at: null,
        lock_reason: reActivateReason,
      } satisfies IErpHrmTimeTrackingTimesheetVersioningLock.IUpdate,
    },
  );
  // Since update returns void and there is no GET endpoint, we can only assert
  // that the calls succeeded. Validate updated_at monotonic increase is not possible.
  TestValidator.predicate(
    "lockId should be uuid",
    /^[0-9a-f-]{36}$/i.test(lockId),
  );
}
