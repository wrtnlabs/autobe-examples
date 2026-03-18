import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import type { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timelog_self_filter_by_project_task_and_billable(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(member);
  const projectId = typia.random<string & tags.Format<"uuid">>();
  const taskId = typia.random<string & tags.Format<"uuid">>();
  const workDateFrom = new Date("2026-03-02T00:00:00.000Z").toISOString();
  const workDateTo = new Date("2026-03-08T23:59:59.999Z").toISOString();
  const requestBase = {
    work_date_from: workDateFrom,
    work_date_to: workDateTo,
    page: 1,
    limit: 100,
    sort: "work_date_asc",
  } satisfies IHrmTimeTrackingTimelog.IRequest;
  const responseByRange =
    await api.functional.hrmTimeTracking.member.me.timelogs.index(
      memberConnection,
      {
        body: requestBase,
      },
    );
  typia.assert(responseByRange);
  const responseByProject =
    await api.functional.hrmTimeTracking.member.me.timelogs.index(
      memberConnection,
      {
        body: {
          ...requestBase,
          project_id: projectId,
        } satisfies IHrmTimeTrackingTimelog.IRequest,
      },
    );
  typia.assert(responseByProject);
  const responseByProjectTask =
    await api.functional.hrmTimeTracking.member.me.timelogs.index(
      memberConnection,
      {
        body: {
          ...requestBase,
          project_id: projectId,
          task_id: taskId,
        } satisfies IHrmTimeTrackingTimelog.IRequest,
      },
    );
  typia.assert(responseByProjectTask);
  const responseByProjectTaskBillable =
    await api.functional.hrmTimeTracking.member.me.timelogs.index(
      memberConnection,
      {
        body: {
          ...requestBase,
          project_id: projectId,
          task_id: taskId,
          billable: true,
        } satisfies IHrmTimeTrackingTimelog.IRequest,
      },
    );
  typia.assert(responseByProjectTaskBillable);
  TestValidator.predicate(
    "range filtered page should be a valid page response",
    responseByRange.pagination.current >= 1 &&
      responseByRange.pagination.limit >= 0 &&
      responseByRange.pagination.records >= 0 &&
      responseByRange.pagination.pages >= 0 &&
      Array.isArray(responseByRange.data),
  );
  TestValidator.predicate(
    "project filtered page should be a valid page response",
    responseByProject.pagination.current >= 1 &&
      responseByProject.pagination.limit >= 0 &&
      responseByProject.pagination.records >= 0 &&
      responseByProject.pagination.pages >= 0 &&
      Array.isArray(responseByProject.data),
  );
  TestValidator.predicate(
    "task filtered page should be a valid page response",
    responseByProjectTask.pagination.current >= 1 &&
      responseByProjectTask.pagination.limit >= 0 &&
      responseByProjectTask.pagination.records >= 0 &&
      responseByProjectTask.pagination.pages >= 0 &&
      Array.isArray(responseByProjectTask.data),
  );
  TestValidator.predicate(
    "billable filtered page should be a valid page response",
    responseByProjectTaskBillable.pagination.current >= 1 &&
      responseByProjectTaskBillable.pagination.limit >= 0 &&
      responseByProjectTaskBillable.pagination.records >= 0 &&
      responseByProjectTaskBillable.pagination.pages >= 0 &&
      Array.isArray(responseByProjectTaskBillable.data),
  );
  TestValidator.predicate(
    "refined filters should not return more rows than broader filters",
    responseByProjectTaskBillable.data.length <=
      responseByProjectTask.data.length &&
      responseByProjectTask.data.length <= responseByProject.data.length &&
      responseByProject.data.length <= responseByRange.data.length,
  );
}
