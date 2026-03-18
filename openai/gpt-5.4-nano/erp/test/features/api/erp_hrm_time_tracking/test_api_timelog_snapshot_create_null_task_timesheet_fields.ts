import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import type { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import type { IErpHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTask";
import type { IErpHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimelog";
import type { IErpHrmTimeTrackingTimelogSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimelogSnapshot";
import type { IErpHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_tracking_member_timelog_snapshots_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_timelog_snapshots_create";
import { generate_random_erp_hrm_time_tracking_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_time_tracking_member_timelogs_create";
import { prepare_random_erp_hrm_time_tracking_timelog } from "../../../prepare/prepare_random_erp_hrm_time_tracking_timelog";
import { prepare_random_erp_hrm_time_tracking_timelog_snapshot } from "../../../prepare/prepare_random_erp_hrm_time_tracking_timelog_snapshot";

export async function test_api_timelog_snapshot_create_null_task_timesheet_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password-1234!",
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "KRW",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/join" as string & tags.Format<"uri">,
      referrer: "https://example.com/ref" as string & tags.Format<"uri">,
      organizationLogoUrl: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  // Create actor-specific connection (base connection must not be used directly)
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers ??= {};
  // authorize_member_join mutates the passed connection headers, so mirror them
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  userConnection.headers.Authorization =
    memberConnection.headers!.Authorization;
  // 2) Create a timelog without task/timesheet linkage
  const timelog =
    await generate_random_erp_hrm_time_tracking_member_timelogs_create(
      userConnection,
      {
        body: {
          erpHrmTimeTrackingTaskId: null,
          erpHrmTimeTrackingTimesheetId: null,
        },
      },
    );
  typia.assert(timelog);
  const startedAt: string & tags.Format<"date-time"> = (timelog.start_time ??
    typia.random<string & tags.Format<"date-time">>()) as
    | (string & tags.Format<"date-time">)
    | (string & tags.Format<"date-time">);
  const endedAt: string & tags.Format<"date-time"> = (timelog.end_time ??
    typia.random<string & tags.Format<"date-time">>()) as
    | (string & tags.Format<"date-time">)
    | (string & tags.Format<"date-time">);
  const workDescription = timelog.note ?? "";
  // 3) Create timelog snapshot and verify null optional foreign keys
  const snapshot =
    await generate_random_erp_hrm_time_tracking_member_timelog_snapshots_create(
      userConnection,
      {
        body: {
          erp_hrm_time_tracking_timelog_id: timelog.id,
          task_id: null,
          timesheet_id: null,
          source_timer_session_id: null,
          started_at: startedAt,
          ended_at: endedAt,
          duration_minutes: timelog.duration_minutes,
          work_description: workDescription,
          workflow_status: "draft",
        },
      },
    );
  typia.assert(snapshot);
  TestValidator.equals("snapshot.task_id is null", snapshot.task_id, null);
  TestValidator.equals(
    "snapshot.timesheet_id is null",
    snapshot.timesheet_id,
    null,
  );
  TestValidator.equals(
    "snapshot.source_timer_session_id is null",
    snapshot.source_timer_session_id,
    null,
  );
  TestValidator.equals(
    "snapshot duration_minutes matches timelog",
    snapshot.duration_minutes,
    timelog.duration_minutes,
  );
  TestValidator.equals(
    "snapshot work_description matches timelog note",
    snapshot.work_description,
    workDescription,
  );
  TestValidator.equals(
    "snapshot started_at matches",
    snapshot.started_at,
    startedAt,
  );
  TestValidator.equals("snapshot ended_at matches", snapshot.ended_at, endedAt);
  // workflow_status is required in snapshot payload; validate it is present
  TestValidator.predicate(
    "snapshot.workflow_status is non-empty",
    snapshot.workflow_status.length > 0,
  );
}
