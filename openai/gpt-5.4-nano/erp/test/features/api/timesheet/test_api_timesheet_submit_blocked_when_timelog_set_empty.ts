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
import { generate_random_erp_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_projects_create";
import { generate_random_erp_hrm_time_tracking_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_timelogs_create";
import { generate_random_erp_hrm_time_tracking_member_timesheets_create_timesheet } from "../../../generate/generate_random_erp_hrm_time_tracking_member_timesheets_create_timesheet";
import { prepare_random_erp_hrm_time_tracking_project } from "../../../prepare/prepare_random_erp_hrm_time_tracking_project";
import { prepare_random_erp_hrm_time_tracking_timelog } from "../../../prepare/prepare_random_erp_hrm_time_tracking_timelog";
import { prepare_random_erp_hrm_time_tracking_timesheet } from "../../../prepare/prepare_random_erp_hrm_time_tracking_timesheet";

export async function test_api_timesheet_submit_blocked_when_timelog_set_empty(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    organizationName: RandomGenerator.name(),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationLogoUrl: null,
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 1,
    href: "https://example.com/join",
    referrer: "https://example.com/referrer",
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  await authorize_member_join(memberConnection, { body: joinInput });

  const project =
    await generate_random_erp_hrm_time_tracking_member_projects_create(
      memberConnection,
      {},
    );
  typia.assert(project);

  const timesheetBefore =
    await generate_random_erp_hrm_time_tracking_member_timesheets_create_timesheet(
      memberConnection,
      {},
    );
  typia.assert(timesheetBefore);

  TestValidator.equals(
    "submittedAt starts as null",
    timesheetBefore.submittedAt,
    null,
  );

  const timelogWorkDate = typia.random<string & tags.Format<"date-time">>();
  const timelog =
    await generate_random_erp_hrm_time_tracking_member_timelogs_create(
      memberConnection,
      {
        body: {
          work_date: timelogWorkDate,
          start_time: null,
          end_time: null,
          duration_minutes: 60,
          note: null,
          erpHrmTimeTrackingProjectId: project.id,
          erpHrmTimeTrackingTaskId: null,
          erpHrmTimeTrackingTimesheetId: null,
        },
      },
    );
  typia.assert(timelog);

  await TestValidator.error(
    "submit blocked when timesheet has no timelogs",
    async () => {
      try {
        await api.functional.erpHrmTimeTracking.member.timesheets.submit(
          memberConnection,
          { timesheetId: timesheetBefore.id },
        );
        throw new Error("Expected submit to fail, but it succeeded");
      } catch (err: unknown) {
        const message =
          typeof err === "object" && err !== null && "message" in err
            ? String((err as { message?: unknown }).message ?? "")
            : String(err);

        const lower = message.toLowerCase();
        TestValidator.predicate(
          "error message indicates timelog requirement",
          () =>
            lower.includes("timelog") &&
            (lower.includes("at least") ||
              lower.includes("requires") ||
              lower.includes("one")),
        );
        throw err;
      }
    },
  );

  TestValidator.equals(
    "submittedAt remains null (pre-state invariant)",
    timesheetBefore.submittedAt,
    null,
  );
}
