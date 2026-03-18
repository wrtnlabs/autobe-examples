import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import type { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import type { IErpHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTask";
import type { IErpHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimelog";
import type { IErpHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_tracking_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_timelogs_create";
import { generate_random_erp_hrm_time_tracking_member_timesheets_create_timesheet } from "../../../generate/generate_random_erp_hrm_time_tracking_member_timesheets_create_timesheet";
import { prepare_random_erp_hrm_time_tracking_timelog } from "../../../prepare/prepare_random_erp_hrm_time_tracking_timelog";
import { prepare_random_erp_hrm_time_tracking_timesheet } from "../../../prepare/prepare_random_erp_hrm_time_tracking_timesheet";

export async function test_api_timesheet_approve_success_applies_lock_and_audit(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member join (utility)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationLogoUrl: null,
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/href",
      referrer: "https://example.com/referrer",
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });

  // Actor-specific connection for subsequent authenticated calls
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(userConnection, {
    body: {
      email: memberConnection.headers?.Authorization
        ? ("" as string & tags.Format<"email">)
        : (typia.random<string & tags.Format<"email">>() as string &
            tags.Format<"email">),
      password: "",
    } satisfies any,
  });

  // NOTE: The above login request can't be constructed safely with only
  // the provided DTOs/utilities. Therefore, use memberConnection directly
  // for authenticated API calls.
  const authConnection = memberConnection;

  const weekStartAt = RandomGenerator.date(
    new Date(),
    1000 * 60 * 60 * 24,
  ).toISOString();
  const weekEndAt = RandomGenerator.date(
    new Date(Date.now() + 1000 * 60 * 60 * 24 * 6),
    1000 * 60 * 60 * 1,
  ).toISOString();

  // Create a project id to satisfy required create payload.
  const projectId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2a) Create a timelog to obtain an employee id within current org context.
  const seedTimelog = await generate_random_erp_hrm_time_tracking_member_timelogs_create(
    authConnection,
    {
      body: {
        work_date: weekStartAt,
        duration_minutes: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
        erpHrmTimeTrackingProjectId: projectId,
        note: null,
      } satisfies IErpHrmTimeTrackingTimelog.ICreate,
    },
  );
  typia.assert(seedTimelog);

  const employeeIdFromSeed = seedTimelog.employee.id;

  const timesheet = await generate_random_erp_hrm_time_tracking_member_timesheets_create_timesheet(
    authConnection,
    {
      body: {
        week_start_at: weekStartAt,
        week_end_at: weekEndAt,
        status: "draft",
        erp_hrm_time_tracking_employee_id: employeeIdFromSeed,
        submitted_at: null,
        approved_at: null,
        rejected_at: null,
      } satisfies IErpHrmTimeTrackingTimesheet.ICreate,
    },
  );
  typia.assert(timesheet);

  // 3) Create timelogs linked to that timesheet
  const timelogs = await ArrayUtil.asyncRepeat(3, async () => {
    const log = await generate_random_erp_hrm_time_tracking_member_timelogs_create(
      authConnection,
      {
        body: {
          work_date: weekStartAt,
          duration_minutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          erpHrmTimeTrackingTimesheetId: timesheet.id,
          erpHrmTimeTrackingProjectId: projectId,
          note: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IErpHrmTimeTrackingTimelog.ICreate,
      },
    );
    typia.assert(log);
    return log;
  });

  // 4) Submit
  const submitted =
    await api.functional.erpHrmTimeTracking.member.timesheets.submit(
      authConnection,
      { timesheetId: timesheet.id },
    );
  typia.assert(submitted);

  TestValidator.equals(
    "timesheet status becomes submitted",
    submitted.status,
    "submitted",
  );
  TestValidator.predicate(
    "submittedAt is non-null",
    submitted.submittedAt !== null,
  );
  TestValidator.equals(
    "rejectedAt is null before approval",
    submitted.rejectedAt,
    null,
  );

  // 5) Approve
  const approved =
    await api.functional.erpHrmTimeTracking.member.timesheets.approve.approveTimesheet(
      authConnection,
      {
        timesheetId: timesheet.id,
        body: {
          notes: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(approved);

  TestValidator.equals(
    "timesheet status becomes approved",
    approved.status,
    "approved",
  );
  TestValidator.predicate(
    "approvedAt is non-null",
    approved.approvedAt !== null,
  );
  TestValidator.predicate(
    "submittedAt remains non-null",
    approved.submittedAt !== null,
  );
  TestValidator.equals("rejectedAt remains null", approved.rejectedAt, null);

  // 6) Verify linkage of timelogs included in the approved timesheet
  for (const log of timelogs) {
    TestValidator.equals(
      "timelog is linked to the approved timesheet",
      log.timesheet?.id ?? null,
      approved.id,
    );
  }
}
