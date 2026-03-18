import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingTimelogSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimelogSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeTrackingTimelogSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTrackingTimelogSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timelog_snapshots_filter_nullable_linkage_semantics(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const credentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    organizationName: RandomGenerator.name(),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 1 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<12>,
    href: "https://example.com/" + typia.random<string & tags.Format<"uuid">>(),
    referrer:
      "https://example.com/ref" + typia.random<string & tags.Format<"uuid">>(),
    ip: null,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  await authorize_member_join(memberConnection, { body: credentials });
  const maxAttempts = 5;
  let baseline: IErpHrmTimeTrackingTimelogSnapshot.ISummary | undefined;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const page =
      await api.functional.erpHrmTimeTracking.member.timelogSnapshots.index(
        memberConnection,
        {
          body: {
            page: 1,
            limit: 1,
          } satisfies IErpHrmTimeTrackingTimelogSnapshot.IRequest,
        },
      );
    typia.assert(page);
    const candidate = page.data[0];
    if (!candidate) continue;
    baseline = candidate;
    const nullTaskPage =
      await api.functional.erpHrmTimeTracking.member.timelogSnapshots.index(
        memberConnection,
        {
          body: {
            erpHrmTimeTrackingTimelogId:
              candidate.erp_hrm_time_tracking_timelog_id,
            employeeId: candidate.employee_id,
            projectId: candidate.project_id,
            workflowStatus: candidate.workflow_status,
            taskId: null,
            timesheetId: candidate.timesheet_id,
            sourceTimerSessionId: candidate.source_timer_session_id,
            page: 1,
            limit: 10,
          } satisfies IErpHrmTimeTrackingTimelogSnapshot.IRequest,
        },
      );
    typia.assert(nullTaskPage);
    const mixedTaskPage =
      await api.functional.erpHrmTimeTracking.member.timelogSnapshots.index(
        memberConnection,
        {
          body: {
            erpHrmTimeTrackingTimelogId:
              candidate.erp_hrm_time_tracking_timelog_id,
            employeeId: candidate.employee_id,
            projectId: candidate.project_id,
            workflowStatus: candidate.workflow_status,
            timesheetId: candidate.timesheet_id,
            sourceTimerSessionId: candidate.source_timer_session_id,
            page: 1,
            limit: 10,
          } satisfies IErpHrmTimeTrackingTimelogSnapshot.IRequest,
        },
      );
    typia.assert(mixedTaskPage);
    const hasNullTask = nullTaskPage.data.length > 0;
    const hasNonNullTask = mixedTaskPage.data.some((x) => x.task_id !== null);
    if (hasNullTask && hasNonNullTask) break;
    baseline = undefined;
  }
  if (!baseline) {
    throw new Error(
      "Failed to find a baseline timelog snapshot that has both nullable and non-null task linkage for filtering semantics",
    );
  }
  const expectedTimelogId = baseline.erp_hrm_time_tracking_timelog_id;
  const expectedEmployeeId = baseline.employee_id;
  const expectedProjectId = baseline.project_id;
  const expectedWorkflowStatus = baseline.workflow_status;
  const expectedTaskId: (string & tags.Format<"uuid">) | null = baseline.task_id;
  const expectedTimesheetId: (string & tags.Format<"uuid">) | null =
    baseline.timesheet_id;
  const expectedSourceTimerSessionId: (string & tags.Format<"uuid">) | null =
    baseline.source_timer_session_id;

  const filterReqBase = {
    erpHrmTimeTrackingTimelogId: expectedTimelogId,
    employeeId: expectedEmployeeId,
    projectId: expectedProjectId,
    workflowStatus: expectedWorkflowStatus,
    taskId: expectedTaskId,
    timesheetId: expectedTimesheetId,
    sourceTimerSessionId: expectedSourceTimerSessionId,
    page: 1,
    limit: 100,
  } satisfies IErpHrmTimeTrackingTimelogSnapshot.IRequest;

  const filteredPage =
    await api.functional.erpHrmTimeTracking.member.timelogSnapshots.index(
      memberConnection,
      { body: filterReqBase },
    );
  typia.assert(filteredPage);

  for (const item of filteredPage.data) {
    TestValidator.equals(
      "timelog id matches",
      item.erp_hrm_time_tracking_timelog_id,
      expectedTimelogId,
    );
    TestValidator.equals(
      "employee id matches",
      item.employee_id,
      expectedEmployeeId,
    );
    TestValidator.equals(
      "project id matches",
      item.project_id,
      expectedProjectId,
    );
    TestValidator.equals(
      "workflow status matches",
      item.workflow_status,
      expectedWorkflowStatus,
    );
    TestValidator.equals(
      "task_id matches linkage",
      item.task_id,
      expectedTaskId,
    );
    TestValidator.equals(
      "timesheet_id matches linkage",
      item.timesheet_id,
      expectedTimesheetId,
    );
    TestValidator.equals(
      "source_timer_session_id matches linkage",
      item.source_timer_session_id,
      expectedSourceTimerSessionId,
    );
  }

  const mixedTaskPage =
    await api.functional.erpHrmTimeTracking.member.timelogSnapshots.index(
      memberConnection,
      {
        body: {
          erpHrmTimeTrackingTimelogId: expectedTimelogId,
          employeeId: expectedEmployeeId,
          projectId: expectedProjectId,
          workflowStatus: expectedWorkflowStatus,
          timesheetId: expectedTimesheetId,
          sourceTimerSessionId: expectedSourceTimerSessionId,
          page: 1,
          limit: 20,
        } satisfies IErpHrmTimeTrackingTimelogSnapshot.IRequest,
      },
    );
  typia.assert(mixedTaskPage);

  const discoveredNonNullTaskId: (string & tags.Format<"uuid">) | null =
    mixedTaskPage.data.find((x) => x.task_id !== null)?.task_id ?? null;

  const toggledTaskId: (string & tags.Format<"uuid">) | null =
    expectedTaskId === null
      ? typia.assert(discoveredNonNullTaskId)
      : null;

  const toggledReq = {
    ...filterReqBase,
    taskId: toggledTaskId,
  } satisfies IErpHrmTimeTrackingTimelogSnapshot.IRequest;

  const toggledPage =
    await api.functional.erpHrmTimeTracking.member.timelogSnapshots.index(
      memberConnection,
      { body: toggledReq },
    );
  typia.assert(toggledPage);

  const baseIds = filteredPage.data.map((x) => x.id);
  const toggledIds = toggledPage.data.map((x) => x.id);
  TestValidator.notEquals(
    "result sets differ when toggling nullable taskId",
    baseIds,
    toggledIds,
  );
}
