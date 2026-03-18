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

export async function test_api_timesheet_versioning_lock_release_requires_lock_holder(
  connection: api.IConnection,
): Promise<void> {
  const orgName = `org_${RandomGenerator.alphabets(8)}`;
  const user1Input = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password!1234",
    organizationName: orgName,
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 1 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<12>,
    href: "https://example.com/join" satisfies string & tags.Format<"uri">,
    referrer: "https://example.com/ref" satisfies string & tags.Format<"uri">,
    ip: "127.0.0.1" satisfies string & tags.Format<"ipv4">,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const user2Input = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password!1234",
    organizationName: orgName,
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 1 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<12>,
    href: "https://example.com/join" satisfies string & tags.Format<"uri">,
    referrer: "https://example.com/ref" satisfies string & tags.Format<"uri">,
    ip: "127.0.0.1" satisfies string & tags.Format<"ipv4">,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const user1Connection: api.IConnection = { host: connection.host };
  const user1Auth = await authorize_member_join(user1Connection, {
    body: user1Input,
  });
  const user2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(user2Connection, { body: user2Input });
  // User1 creates a lock owned by user1
  const lock =
    await generate_random_erp_hrm_time_tracking_member_timesheet_versioning_locks_create(
      user1Connection,
      {
        body: {
          locked_by_user_id: user1Auth.id,
          lock_reason: "initial-lock",
        },
      },
    );
  typia.assert(lock);
  const lockId = lock.id;
  // User2 attempts to release/cancel lock they do not own
  const releaseMarker = new Date().toISOString() satisfies string &
    tags.Format<"date-time">;
  const user2LockReason = "attempted-release-by-user2";
  await TestValidator.error(
    "user2 cannot release a lock owned by user1",
    async () => {
      await api.functional.erpHrmTimeTracking.member.timesheetVersioningLocks.update(
        user2Connection,
        {
          lockId,
          body: {
            deleted_at: releaseMarker,
            lock_reason: user2LockReason,
          } satisfies IErpHrmTimeTrackingTimesheetVersioningLock.IUpdate,
        },
      );
    },
  );
  // Allowed path: user1 releases the lock successfully
  const releaseByUser1Marker = new Date().toISOString() satisfies string &
    tags.Format<"date-time">;
  await api.functional.erpHrmTimeTracking.member.timesheetVersioningLocks.update(
    user1Connection,
    {
      lockId,
      body: {
        deleted_at: releaseByUser1Marker,
        lock_reason: "released-by-user1",
      } satisfies IErpHrmTimeTrackingTimesheetVersioningLock.IUpdate,
    },
  );
}
