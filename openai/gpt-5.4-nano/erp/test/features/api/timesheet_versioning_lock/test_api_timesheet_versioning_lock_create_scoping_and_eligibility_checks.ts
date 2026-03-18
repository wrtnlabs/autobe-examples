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

export async function test_api_timesheet_versioning_lock_create_scoping_and_eligibility_checks(
  connection: api.IConnection,
): Promise<void> {
  // <E2E TEST CODE HERE>
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA: IErpHrmTimeTrackingMember.IAuthorized =
    await authorize_member_join(memberAConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string>(),
        organizationName: RandomGenerator.alphabets(10),
        organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
        organizationCurrencyCode: "USD",
        organizationTimezone: "Asia/Seoul",
        organizationFiscalStartMonth: 1,
        href: "https://example.com/terms",
        referrer: "https://example.com/entry",
        ip: null,
      } satisfies IErpHrmTimeTrackingMember.IJoin,
    });
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB: IErpHrmTimeTrackingMember.IAuthorized =
    await authorize_member_join(memberBConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string>(),
        organizationName: RandomGenerator.alphabets(12),
        organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
        organizationCurrencyCode: "USD",
        organizationTimezone: "Asia/Seoul",
        organizationFiscalStartMonth: 1,
        href: "https://example.com/terms",
        referrer: "https://example.com/entry",
        ip: null,
      } satisfies IErpHrmTimeTrackingMember.IJoin,
    });
  const lockReasonA = `lock-${RandomGenerator.alphabets(8)}`;
  const lockA: IErpHrmTimeTrackingTimesheetVersioningLock =
    await generate_random_erp_hrm_time_tracking_member_timesheet_versioning_locks_create(
      memberAConnection,
      {
        body: {
          locked_by_user_id: memberA.id,
          lock_reason: lockReasonA,
        } satisfies DeepPartial<IErpHrmTimeTrackingTimesheetVersioningLock.ICreate>,
      },
    );
  typia.assert(lockA);
  TestValidator.equals(
    "locked_by_user_id matches authenticated member",
    lockA.locked_by_user_id,
    memberA.id,
  );
  TestValidator.equals(
    "lock_reason stored exactly",
    lockA.lock_reason,
    lockReasonA,
  );
  TestValidator.equals("deleted_at is null (active)", lockA.deleted_at, null);
  // Scoping: attempt to create a lock for the same timesheet but with a
  // different actor/user ownership.
  const crossOrgReason = `cross-${RandomGenerator.alphabets(8)}`;
  await TestValidator.error(
    "scoping rejection: lock cannot be created with a different locked_by_user_id",
    async () => {
      await generate_random_erp_hrm_time_tracking_member_timesheet_versioning_locks_create(
        memberBConnection,
        {
          body: {
            timesheet_id: lockA.timesheet_id,
            locked_by_user_id: memberA.id,
            lock_reason: crossOrgReason,
          } satisfies DeepPartial<IErpHrmTimeTrackingTimesheetVersioningLock.ICreate>,
        },
      );
    },
  );
  // Eligibility/uniqueness: second active lock creation for same timesheet
  // should be rejected.
  const duplicateReason = `dup-${RandomGenerator.alphabets(8)}`;
  await TestValidator.error(
    "eligibility rejection: cannot create a second active lock for same timesheet",
    async () => {
      await generate_random_erp_hrm_time_tracking_member_timesheet_versioning_locks_create(
        memberAConnection,
        {
          body: {
            timesheet_id: lockA.timesheet_id,
            locked_by_user_id: memberA.id,
            lock_reason: duplicateReason,
          } satisfies DeepPartial<IErpHrmTimeTrackingTimesheetVersioningLock.ICreate>,
        },
      );
    },
  );
}
