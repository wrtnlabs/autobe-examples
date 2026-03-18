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

export async function test_api_timesheet_versioning_lock_update_active_by_owner(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = "Password123!";
  const authorized = await authorize_member_join(memberConnection, {
    body: {
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
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorized);
  const lockReason1 = RandomGenerator.paragraph({ sentences: 1 });
  const lock =
    await generate_random_erp_hrm_time_tracking_member_timesheet_versioning_locks_create(
      memberConnection,
      {
        body: {
          timesheet_id: typia.random<string & tags.Format<"uuid">>(),
          locked_by_user_id: authorized.id,
          lock_reason: lockReason1,
        } satisfies IErpHrmTimeTrackingTimesheetVersioningLock.ICreate,
      },
    );
  typia.assert(lock);
  const prevUpdatedAt = lock.updated_at;
  const updatedReason = RandomGenerator.paragraph({ sentences: 2 });
  const updated =
    await api.functional.erpHrmTimeTracking.member.timesheetVersioningLocks.updateVersioningLock(
      memberConnection,
      {
        body: {
          lock_reason: updatedReason,
          deleted_at: null,
        } satisfies IErpHrmTimeTrackingTimesheetVersioningLock.IUpdate,
      },
    );
  typia.assert(updated);
  TestValidator.equals("lock id preserved", updated.id, lock.id);
  TestValidator.equals(
    "timesheet id preserved",
    updated.timesheet_id,
    lock.timesheet_id,
  );
  TestValidator.equals("deleted_at stays null", updated.deleted_at, null);
  TestValidator.equals(
    "lock_reason updated",
    updated.lock_reason,
    updatedReason,
  );
  TestValidator.predicate(
    "updated_at advanced",
    new Date(updated.updated_at).getTime() > new Date(prevUpdatedAt).getTime(),
  );
}
