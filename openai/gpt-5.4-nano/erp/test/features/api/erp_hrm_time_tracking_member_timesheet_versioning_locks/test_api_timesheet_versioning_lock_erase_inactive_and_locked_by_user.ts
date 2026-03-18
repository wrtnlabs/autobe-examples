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

export async function test_api_timesheet_versioning_lock_erase_inactive_and_locked_by_user(
  connection: api.IConnection,
): Promise<void> {
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: `https://${RandomGenerator.alphabets(6)}.example.com/join`,
      referrer: `https://${RandomGenerator.alphabets(6)}.example.com/ref`,
      organizationLogoUrl: null,
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(memberA);
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: `https://${RandomGenerator.alphabets(6)}.example.com/join`,
      referrer: `https://${RandomGenerator.alphabets(6)}.example.com/ref`,
      organizationLogoUrl: null,
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(memberB);
  // 1) Create an active lock as member A
  const createdLock =
    await generate_random_erp_hrm_time_tracking_member_timesheet_versioning_locks_create(
      memberAConnection,
      {},
    );
  typia.assert(createdLock);
  TestValidator.equals(
    "locked_by_user_id is owner (member A)",
    createdLock.locked_by_user_id,
    memberA.id,
  );
  // 2) Owner deletes the lock successfully
  await api.functional.erpHrmTimeTracking.member.timesheetVersioningLocks.erase(
    memberAConnection,
    {
      lockId: createdLock.id,
    },
  );
  // 3) Second delete should fail (already released/inactive)
  await TestValidator.error(
    "second erase should be rejected for inactive/released lock",
    async () => {
      await api.functional.erpHrmTimeTracking.member.timesheetVersioningLocks.erase(
        memberAConnection,
        {
          lockId: createdLock.id,
        },
      );
    },
  );
  // 4) Non-owner cannot erase the lock
  const createdLock2 =
    await generate_random_erp_hrm_time_tracking_member_timesheet_versioning_locks_create(
      memberAConnection,
      {},
    );
  typia.assert(createdLock2);
  TestValidator.equals(
    "locked_by_user_id is owner for lock2 (member A)",
    createdLock2.locked_by_user_id,
    memberA.id,
  );
  await TestValidator.error("non-owner erase should be rejected", async () => {
    await api.functional.erpHrmTimeTracking.member.timesheetVersioningLocks.erase(
      memberBConnection,
      {
        lockId: createdLock2.id,
      },
    );
  });
  // 5) Owner can still erase it after the failed non-owner attempt
  await api.functional.erpHrmTimeTracking.member.timesheetVersioningLocks.erase(
    memberAConnection,
    {
      lockId: createdLock2.id,
    },
  );
}
