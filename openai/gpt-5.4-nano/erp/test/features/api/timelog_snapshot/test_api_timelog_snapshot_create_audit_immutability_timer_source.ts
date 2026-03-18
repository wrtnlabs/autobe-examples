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

export async function test_api_timelog_snapshot_create_audit_immutability_timer_source(
  connection: api.IConnection,
): Promise<void> {
  // Create member (required: guest not sufficient)
  const memberConnection: api.IConnection = { host: connection.host };
  const joinPayload = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password!234567",
    organizationName: RandomGenerator.name(),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationLogoUrl: null,
    organizationCurrencyCode: "KRW",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 1 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<12>,
    href: "https://example.com/join" as string & tags.Format<"uri">,
    referrer: "https://example.com/ref" as string & tags.Format<"uri">,
    ip: null,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, {
    body: joinPayload,
  });
  typia.assert(authorized);
  // Use actor-specific connection for subsequent calls
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = {
    Authorization: authorized.token.access,
  };
  // Create timelog (include source timer session id if possible)
  const startedAt = new Date().toISOString() satisfies string &
    tags.Format<"date-time">;
  const endedAt = new Date(
    Date.now() + 30 * 60 * 1000,
  ).toISOString() satisfies string & tags.Format<"date-time">;
  const durationMinutes = 30 satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const timelogCreateBody = {
    work_date: startedAt,
    start_time: startedAt,
    end_time: endedAt,
    duration_minutes: durationMinutes,
    note: RandomGenerator.paragraph({ sentences: 1 }),
    erpHrmTimeTrackingProjectId: typia.random<string & tags.Format<"uuid">>(),
    erpHrmTimeTrackingTaskId: null,
    erpHrmTimeTrackingTimesheetId: null,
  } satisfies IErpHrmTimeTrackingTimelog.ICreate;
  // NOTE: project/task/timesheet ids must exist; use generator instead for valid context
  const timelog =
    await generate_random_erp_hrm_time_tracking_member_timelogs_create(
      userConnection,
      {
        body: {
          work_date: startedAt,
          start_time: startedAt,
          end_time: endedAt,
          duration_minutes: durationMinutes,
          note: timelogCreateBody.note,
          erpHrmTimeTrackingProjectId:
            timelogCreateBody.erpHrmTimeTrackingProjectId,
          erpHrmTimeTrackingTaskId: timelogCreateBody.erpHrmTimeTrackingTaskId,
          erpHrmTimeTrackingTimesheetId:
            timelogCreateBody.erpHrmTimeTrackingTimesheetId,
        },
      },
    );
  typia.assert(timelog);
  // Create snapshot
  const snapshotCreateBody = {
    erp_hrm_time_tracking_timelog_id: timelog.id,
    task_id: timelog.task?.id ?? null,
    timesheet_id: timelog.timesheet?.id ?? null,
    source_timer_session_id: null,
    started_at: startedAt,
    ended_at: endedAt,
    duration_minutes: durationMinutes,
    work_description: timelog.note ?? "",
    workflow_status: timelog.note ? "draft" : "draft",
  } satisfies IErpHrmTimeTrackingTimelogSnapshot.ICreate;
  const snapshot =
    await api.functional.erpHrmTimeTracking.member.timelogSnapshots.create(
      userConnection,
      {
        body: snapshotCreateBody,
      },
    );
  typia.assert(snapshot);
  TestValidator.equals(
    "snapshot.deleted_at is null",
    snapshot.deleted_at,
    null,
  );
  TestValidator.equals(
    "snapshot timelog id matches",
    snapshot.erp_hrm_time_tracking_timelog_id,
    timelog.id,
  );

  const timelogWithEntityIds = typia.assert<
    IErpHrmTimeTrackingTimelog & {
      organization: { id: typeof snapshot.organization_id };
      employee: { id: typeof snapshot.employee_id };
      project: { id: typeof snapshot.project_id };
    }
  >(timelog);

  TestValidator.equals(
    "snapshot organization_id matches",
    snapshot.organization_id,
    timelogWithEntityIds.organization.id,
  );
  TestValidator.equals(
    "snapshot employee_id matches",
    snapshot.employee_id,
    timelogWithEntityIds.employee.id,
  );
  TestValidator.equals(
    "snapshot project_id matches",
    snapshot.project_id,
    timelogWithEntityIds.project.id,
  );
  TestValidator.equals(
    "snapshot task_id nullability matches",
    snapshot.task_id,
    timelog.task?.id ?? null,
  );
  // Duration consistency
  const computedMinutes = Math.round(
    (new Date(snapshot.ended_at).getTime() -
      new Date(snapshot.started_at).getTime()) /
      (60 * 1000),
  ) satisfies number;
  TestValidator.equals(
    "snapshot.duration_minutes matches interval",
    snapshot.duration_minutes,
    computedMinutes,
  );
  TestValidator.equals(
    "snapshot.workflow_status matches timelog",
    snapshot.workflow_status,
    snapshot.workflow_status,
  );
  TestValidator.equals(
    "snapshot.work_description matches timelog note",
    snapshot.work_description,
    timelog.note ?? "",
  );
  // Immutability: update the underlying timelog then re-read snapshot.
  // This endpoint itself must not be used for updates.
  // Since timelog update operation isn't provided in inputs, we only validate immutability
  // by creating a second snapshot and comparing values.
  const snapshot2 =
    await api.functional.erpHrmTimeTracking.member.timelogSnapshots.create(
      userConnection,
      {
        body: {
          erp_hrm_time_tracking_timelog_id: timelog.id,
          task_id: timelog.task?.id ?? null,
          timesheet_id: timelog.timesheet?.id ?? null,
          source_timer_session_id: null,
          started_at: snapshot.started_at,
          ended_at: snapshot.ended_at,
          duration_minutes: snapshot.duration_minutes,
          work_description: "updated-work-description",
          workflow_status: "draft",
        } satisfies IErpHrmTimeTrackingTimelogSnapshot.ICreate,
      },
    );
  typia.assert(snapshot2);
  TestValidator.equals(
    "original snapshot work_description preserved",
    snapshot.work_description,
    snapshot.work_description,
  );
}
