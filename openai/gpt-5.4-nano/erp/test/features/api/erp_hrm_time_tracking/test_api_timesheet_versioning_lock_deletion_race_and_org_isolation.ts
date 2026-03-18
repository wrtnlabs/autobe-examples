import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import type { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import type { IErpHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTask";
import type { IErpHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimelog";
import type { IErpHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimesheet";
import type { IErpHrmTimeTrackingTimesheetVersioningLock } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimesheetVersioningLock";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_organizations_create";
import { generate_random_erp_hrm_time_tracking_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_timelogs_create";
import { generate_random_erp_hrm_time_tracking_member_timesheet_versioning_locks_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_timesheet_versioning_locks_create";
import { prepare_random_erp_hrm_time_tracking_organization } from "../../../prepare/prepare_random_erp_hrm_time_tracking_organization";
import { prepare_random_erp_hrm_time_tracking_timelog } from "../../../prepare/prepare_random_erp_hrm_time_tracking_timelog";
import { prepare_random_erp_hrm_time_tracking_timesheet_versioning_lock } from "../../../prepare/prepare_random_erp_hrm_time_tracking_timesheet_versioning_lock";

export async function test_api_timesheet_versioning_lock_deletion_race_and_org_isolation(
  connection: api.IConnection,
): Promise<void> {
  const memberA: api.IConnection = { host: connection.host };
  const authorizedA = await authorize_member_join(memberA, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string>(),
      organizationName: `${RandomGenerator.name()}-${RandomGenerator.alphabets(6)}`,
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: typia.random<string>(),
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
      >(),
      href: `https://example.com/${RandomGenerator.alphabets(8)}`,
      referrer: `https://example.com/${RandomGenerator.alphabets(10)}`,
      organizationLogoUrl: null,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorizedA);
  // Ensure an explicit Org A context (tenant boundary)
  const orgA =
    await generate_random_erp_hrm_time_tracking_member_organizations_create(
      memberA,
      {
        body: {
          name: `${RandomGenerator.name()}-${RandomGenerator.alphabets(10)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          currency_code: typia.random<string>(),
          timezone: "Asia/Seoul",
          fiscal_start_month: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
          >(),
          logo_url: null,
        },
      },
    );
  typia.assert(orgA);
  const timelogA =
    await generate_random_erp_hrm_time_tracking_member_timelogs_create(
      memberA,
      {
        body: {
          duration_minutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          work_date: new Date().toISOString(),
        },
      },
    );
  typia.assert(timelogA);
  if (timelogA.timesheet === null) {
    throw new Error(
      "Precondition failed: timelogA.timesheet is null; cannot create a versioning lock without a timesheet_id.",
    );
  }
  const lockA =
    await generate_random_erp_hrm_time_tracking_member_timesheet_versioning_locks_create(
      memberA,
      {
        body: {
          timesheet_id: timelogA.timesheet.id,
          locked_by_user_id: timelogA.employee.id,
          lock_reason: `e2e lock ${RandomGenerator.alphabets(10)}`,
        },
      },
    );
  typia.assert(lockA);
  // Should be blocked while lock exists
  await TestValidator.error(
    "timelog update should be blocked by active versioning lock",
    async () => {
      await api.functional.erpHrmTimeTracking.member.timelogs.update(memberA, {
        timelogId: timelogA.id,
        body: {
          note: `blocked ${RandomGenerator.alphabets(6)}`,
        } satisfies IErpHrmTimeTrackingTimelog.IUpdate,
      });
    },
  );
  await TestValidator.error(
    "timelog erase should be blocked by active versioning lock",
    async () => {
      await api.functional.erpHrmTimeTracking.member.timelogs.erase(memberA, {
        timelogId: timelogA.id,
      });
    },
  );
  // Delete lock (Scenario 1)
  await api.functional.erpHrmTimeTracking.member.timesheetVersioningLocks.erase(
    memberA,
    {
      lockId: lockA.id,
    },
  );
  // Now operations should be permitted
  await api.functional.erpHrmTimeTracking.member.timelogs.update(memberA, {
    timelogId: timelogA.id,
    body: {
      note: `after delete ${RandomGenerator.alphabets(6)}`,
    } satisfies IErpHrmTimeTrackingTimelog.IUpdate,
  });
  await api.functional.erpHrmTimeTracking.member.timelogs.erase(memberA, {
    timelogId: timelogA.id,
  });
  // Scenario 2: org isolation
  const memberB: api.IConnection = { host: connection.host };
  const authorizedB = await authorize_member_join(memberB, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string>(),
      organizationName: `${RandomGenerator.name()}-${RandomGenerator.alphabets(6)}`,
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: typia.random<string>(),
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
      >(),
      href: `https://example.com/${RandomGenerator.alphabets(8)}`,
      referrer: `https://example.com/${RandomGenerator.alphabets(10)}`,
      organizationLogoUrl: null,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorizedB);
  const orgB =
    await generate_random_erp_hrm_time_tracking_member_organizations_create(
      memberB,
      {
        body: {
          name: `${RandomGenerator.name()}-${RandomGenerator.alphabets(10)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          currency_code: typia.random<string>(),
          timezone: "Asia/Seoul",
          fiscal_start_month: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
          >(),
          logo_url: null,
        },
      },
    );
  typia.assert(orgB);
  // Recreate a fresh lock+timelog in Org A because previous lock was deleted
  const timelogA2 =
    await generate_random_erp_hrm_time_tracking_member_timelogs_create(memberA, {
      body: {
        duration_minutes: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
        work_date: new Date().toISOString(),
      },
    });
  typia.assert(timelogA2);
  if (timelogA2.timesheet === null) {
    throw new Error(
      "Precondition failed: timelogA2.timesheet is null; cannot create a versioning lock without a timesheet_id.",
    );
  }
  const lockA2 =
    await generate_random_erp_hrm_time_tracking_member_timesheet_versioning_locks_create(
      memberA,
      {
        body: {
          timesheet_id: timelogA2.timesheet.id,
          locked_by_user_id: timelogA2.employee.id,
          lock_reason: `e2e lock isolation ${RandomGenerator.alphabets(10)}`,
        },
      },
    );
  typia.assert(lockA2);
  await TestValidator.error(
    "org isolation precondition: timelog update should be blocked in Org A while lock exists",
    async () => {
      await api.functional.erpHrmTimeTracking.member.timelogs.update(memberA, {
        timelogId: timelogA2.id,
        body: {
          note: `blocked ${RandomGenerator.alphabets(6)}`,
        } satisfies IErpHrmTimeTrackingTimelog.IUpdate,
      });
    },
  );
  await TestValidator.error(
    "cross-org lock deletion should be rejected",
    async () => {
      await api.functional.erpHrmTimeTracking.member.timesheetVersioningLocks.erase(
        memberB,
        {
          lockId: lockA2.id,
        },
      );
    },
  );
  // Ensure Org A constraint still holds after failed deletion attempt
  await TestValidator.error(
    "timelog update should remain blocked after cross-org deletion attempt",
    async () => {
      await api.functional.erpHrmTimeTracking.member.timelogs.update(memberA, {
        timelogId: timelogA2.id,
        body: {
          note: `still blocked ${RandomGenerator.alphabets(6)}`,
        } satisfies IErpHrmTimeTrackingTimelog.IUpdate,
      });
    },
  );
  // Clean up: delete lock in Org A
  await api.functional.erpHrmTimeTracking.member.timesheetVersioningLocks.erase(
    memberA,
    {
      lockId: lockA2.id,
    },
  );
  await api.functional.erpHrmTimeTracking.member.timelogs.update(memberA, {
    timelogId: timelogA2.id,
    body: {
      note: `after cleanup ${RandomGenerator.alphabets(6)}`,
    } satisfies IErpHrmTimeTrackingTimelog.IUpdate,
  });
  await api.functional.erpHrmTimeTracking.member.timelogs.erase(memberA, {
    timelogId: timelogA2.id,
  });
  // Scenario 3: race condition
  const timelogA3 =
    await generate_random_erp_hrm_time_tracking_member_timelogs_create(memberA, {
      body: {
        duration_minutes: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
        work_date: new Date().toISOString(),
      },
    });
  typia.assert(timelogA3);
  if (timelogA3.timesheet === null) {
    throw new Error(
      "Precondition failed: timelogA3.timesheet is null; cannot create a versioning lock without a timesheet_id.",
    );
  }
  const lockA3 =
    await generate_random_erp_hrm_time_tracking_member_timesheet_versioning_locks_create(
      memberA,
      {
        body: {
          timesheet_id: timelogA3.timesheet.id,
          locked_by_user_id: timelogA3.employee.id,
          lock_reason: `e2e lock race ${RandomGenerator.alphabets(10)}`,
        },
      },
    );
  typia.assert(lockA3);
  const race1 =
    api.functional.erpHrmTimeTracking.member.timesheetVersioningLocks.erase(
      memberA,
      {
        lockId: lockA3.id,
      },
    );
  const race2 =
    api.functional.erpHrmTimeTracking.member.timesheetVersioningLocks.erase(
      memberA,
      {
        lockId: lockA3.id,
      },
    );
  const results = await Promise.allSettled([race1, race2]);
  const fulfilledCount = results.filter((r) => r.status === "fulfilled").length;
  TestValidator.equals(
    "exactly one delete should succeed in race",
    fulfilledCount,
    1,
  );
  await api.functional.erpHrmTimeTracking.member.timelogs.update(memberA, {
    timelogId: timelogA3.id,
    body: {
      note: `after race ${RandomGenerator.alphabets(6)}`,
    } satisfies IErpHrmTimeTrackingTimelog.IUpdate,
  });
  await api.functional.erpHrmTimeTracking.member.timelogs.erase(memberA, {
    timelogId: timelogA3.id,
  });
}
