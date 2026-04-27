import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMember";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTaskHistory";
import type { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import type { IHrmTimeTrackingTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimer";
import type { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingTaskHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { generate_random_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_create";
import { generate_random_hrm_time_tracking_member_projects_tasks_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_tasks_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_task } from "../../../prepare/prepare_random_hrm_time_tracking_task";

export async function test_api_task_history_full_lifecycle_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(authorizedMember);
  // Step 2: Create an organization
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: Create a project within the organization
  const project =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberConnection,
      {},
    );
  typia.assert(project);
  // Step 4: Create a task within the project
  const task =
    await generate_random_hrm_time_tracking_member_projects_tasks_create(
      memberConnection,
      {
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(task);
  // Step 5: Perform status transitions
  // 5.1: open → in-progress
  const taskAfterFirstStatus =
    await api.functional.hrmTimeTracking.member.projects.tasks.status.updateStatus(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          status: "in-progress",
        } satisfies IHrmTimeTrackingTask.IUpdateStatus,
      },
    );
  typia.assert(taskAfterFirstStatus);
  // 5.2: in-progress → completed
  const taskAfterSecondStatus =
    await api.functional.hrmTimeTracking.member.projects.tasks.status.updateStatus(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          status: "completed",
        } satisfies IHrmTimeTrackingTask.IUpdateStatus,
      },
    );
  typia.assert(taskAfterSecondStatus);
  // Step 6: Query task history with no filters to retrieve all entries
  const historyPage =
    await api.functional.hrmTimeTracking.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {},
      },
    );
  typia.assert(historyPage);
  // Step 7: Validation points
  // (a) Response returns exactly 2 history entries (one per status transition)
  TestValidator.equals("history entries count", historyPage.data.length, 2);
  // (b) Entries are sorted by created_at descending (most recent first)
  TestValidator.predicate("entries sorted by created_at descending", () => {
    const [first, second] = historyPage.data;
    return new Date(first.created_at) >= new Date(second.created_at);
  });
  // (c) Each entry contains id, previous_status, new_status, created_at, and employee
  //     summary with id and display_name. This is already validated by typia.assert(historyPage)
  //     which validates the full IPageIHrmTimeTrackingTaskHistory.ISummary type.
  // (d) The most recent entry shows previous_status='in-progress' and new_status='completed'
  TestValidator.equals(
    "most recent previous_status",
    historyPage.data[0].previous_status,
    "in-progress",
  );
  TestValidator.equals(
    "most recent new_status",
    historyPage.data[0].new_status,
    "completed",
  );
  // (e) The older entry shows previous_status='open' and new_status='in-progress'
  TestValidator.equals(
    "older entry previous_status",
    historyPage.data[1].previous_status,
    "open",
  );
  TestValidator.equals(
    "older entry new_status",
    historyPage.data[1].new_status,
    "in-progress",
  );
  // (f) Both entries reference the same employee who performed the status changes
  TestValidator.equals(
    "same employee id across entries",
    historyPage.data[0].employee.id,
    historyPage.data[1].employee.id,
  );
  // (g) Task history is read-only — no write operations are permitted on this endpoint.
  //     This endpoint only supports PATCH for reading paginated history, not for writing.
  //     No write validation needed here — the endpoint contract enforces this.
}
