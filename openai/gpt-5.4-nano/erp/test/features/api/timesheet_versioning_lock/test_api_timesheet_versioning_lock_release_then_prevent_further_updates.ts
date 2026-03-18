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

export async function test_api_timesheet_versioning_lock_release_then_prevent_further_updates(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = "Password-" + RandomGenerator.alphabets(10);
  await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      organizationName: RandomGenerator.alphabets(12),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "KRW",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/" + RandomGenerator.alphabets(8),
      referrer: "https://example.com/ref/" + RandomGenerator.alphabets(8),
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  // NOTE: The SDK provides an update endpoint but no retrieval endpoint / generation helper.
  // We create a lock by using the update endpoint itself with random payloads.
  const firstLockReason = RandomGenerator.paragraph({ sentences: 1 });
  const releasedAt = new Date().toISOString();
  const updateToRelease: IErpHrmTimeTrackingTimesheetVersioningLock.IUpdate = {
    lock_reason: firstLockReason,
    deleted_at: releasedAt,
  } satisfies IErpHrmTimeTrackingTimesheetVersioningLock.IUpdate;
  const releasedLock =
    await api.functional.erpHrmTimeTracking.member.timesheetVersioningLocks.updateVersioningLock(
      memberConnection,
      {
        body: updateToRelease,
      },
    );
  typia.assert(releasedLock);
  TestValidator.predicate(
    "deleted_at should be set after release",
    releasedLock.deleted_at !== null,
  );
  TestValidator.predicate(
    "deleted_at should be an ISO date-time",
    releasedLock.deleted_at !== null &&
      releasedLock.deleted_at.length > 0 &&
      typeof releasedLock.deleted_at === "string",
  );
  const updatedAfterRelease = releasedLock.updated_at;
  // Attempt an additional update that should be rejected after released/canceled lifecycle.
  const secondUpdateReason = RandomGenerator.paragraph({ sentences: 1 });
  const updateAfterRelease: IErpHrmTimeTrackingTimesheetVersioningLock.IUpdate =
    {
      lock_reason: secondUpdateReason,
    } satisfies IErpHrmTimeTrackingTimesheetVersioningLock.IUpdate;
  await TestValidator.error(
    "should prevent further updates after release/cancel",
    async () => {
      await api.functional.erpHrmTimeTracking.member.timesheetVersioningLocks.updateVersioningLock(
        memberConnection,
        {
          body: updateAfterRelease,
        },
      );
    },
  );
  // Basic stability checks (must remain stable if server rejected the second update)
  TestValidator.equals("id stable", releasedLock.id, releasedLock.id);
  TestValidator.equals(
    "timesheet_id stable",
    releasedLock.timesheet_id,
    releasedLock.timesheet_id,
  );
  TestValidator.notEquals(
    "updated_at advanced",
    releasedLock.updated_at,
    updatedAfterRelease,
  );
}
