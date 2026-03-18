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

export async function test_api_timesheet_approve_only_when_submitted_status(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join as a member to initialize organization-scoped context
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd-" + RandomGenerator.alphabets(10),
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationLogoUrl: null,
      organizationCurrencyCode: "KRW",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
      >(),
      href: "https://example.com/join" satisfies string & tags.Format<"uri">,
      referrer: "https://example.com/ref" satisfies string & tags.Format<"uri">,
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorized);
  // Utility already updated memberConnection.headers.Authorization internally
  // 2) Create a draft weekly timesheet
  const draftTimesheet =
    await generate_random_erp_hrm_time_tracking_member_timesheets_create_timesheet(
      memberConnection,
      {
        body: {
          status: "draft",
        } satisfies DeepPartial<IErpHrmTimeTrackingTimesheet.ICreate>,
      },
    );
  typia.assert(draftTimesheet);
  TestValidator.equals(
    "timesheet starts in draft",
    draftTimesheet.status,
    "draft",
  );
  TestValidator.equals(
    "draft timesheet has no submittedAt",
    draftTimesheet.submittedAt,
    null,
  );
  TestValidator.equals(
    "draft timesheet has no approvedAt",
    draftTimesheet.approvedAt,
    null,
  );
  TestValidator.equals(
    "draft timesheet has no rejectedAt",
    draftTimesheet.rejectedAt,
    null,
  );
  // 3) Create a timelog inside the same week and link it to the timesheet
  const someWorkDate = new Date(draftTimesheet.weekStartAt);
  const workDateIso = new Date(
    someWorkDate.getTime() + 24 * 60 * 60 * 1000,
  ).toISOString();
  const timelog =
    await generate_random_erp_hrm_time_tracking_member_timelogs_create(
      memberConnection,
      {
        body: {
          work_date: workDateIso,
          duration_minutes: 60,
          erpHrmTimeTrackingTimesheetId: draftTimesheet.id,
        } satisfies DeepPartial<IErpHrmTimeTrackingTimelog.ICreate>,
      },
    );
  typia.assert(timelog);
  TestValidator.equals(
    "timelog references the created timesheet",
    timelog.timesheet?.id ?? null,
    draftTimesheet.id,
  );
  // 4) Attempt to approve while in draft => must be rejected and must not transition
  await TestValidator.error(
    "approval must be rejected when timesheet is not submitted",
    async () => {
      const approvalAttempt =
        await api.functional.erpHrmTimeTracking.member.timesheets.approve.approveTimesheet(
          memberConnection,
          {
            timesheetId: draftTimesheet.id,
            body: {
              notes: RandomGenerator.paragraph({ sentences: 1 }),
            } satisfies IErpHrmTimeTrackingTimesheet.IApprove,
          },
        );
      // If the API returns a timesheet instead of throwing, it must still remain draft.
      typia.assert(approvalAttempt);
      TestValidator.equals(
        "timesheet remains draft even if response is returned",
        approvalAttempt.status,
        "draft",
      );
    },
  );
}
