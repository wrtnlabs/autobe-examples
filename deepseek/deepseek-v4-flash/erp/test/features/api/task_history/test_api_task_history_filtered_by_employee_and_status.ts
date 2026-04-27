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

/**
 * Test filtered retrieval of task history by employee and status criteria.
 *
 * Validates that the task history paginated listing endpoint supports filtering by employee, status, date range, sorting, and pagination. Ensures each filter operates correctly in isolation and parameters can be combined.
 *
 * 1. Register a member, create organization, project, and task.
 * 2. Perform two status transitions: open → in-progress, in-progress → completed.
 * 3. Query history without filters to obtain the acting employee ID.
 * 4. Query filtered by employee_id and verify all entries match.
 * 5. Query filtered by new_status='completed' and verify all entries match.
 * 6. Query with created_at date range and verify entries are within the window.
 * 7. Query with created_at.asc sort and verify chronological order.
 * 8. Query with page=1, limit=1 and verify single result with correct total.
 */
export async function test_api_task_history_filtered_by_employee_and_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: register member, create organization, project, and task
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  const project =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberConnection,
      {},
    );
  typia.assert(project);
  const task =
    await generate_random_hrm_time_tracking_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(task);
  // 2. Perform two status transitions to generate history entries
  const taskAfterFirstUpdate =
    await api.functional.hrmTimeTracking.member.projects.tasks.status.updateStatus(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: { status: "in-progress" },
      },
    );
  typia.assert(taskAfterFirstUpdate);
  const taskAfterSecondUpdate =
    await api.functional.hrmTimeTracking.member.projects.tasks.status.updateStatus(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: { status: "completed" },
      },
    );
  typia.assert(taskAfterSecondUpdate);
  // 3. Query all history (unfiltered) to get employee ID and prepare for filtered queries
  const allHistory =
    await api.functional.hrmTimeTracking.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: { sort: "created_at.asc" },
      },
    );
  typia.assert(allHistory);
  // Should have at least 2 history entries (open→in-progress, in-progress→completed)
  TestValidator.predicate(
    "at least 2 history entries",
    allHistory.data.length >= 2,
  );
  const employeeId = allHistory.data[0].employee.id;
  // (f) typia.assert on each entry validates all required summary fields
  for (const entry of allHistory.data) {
    typia.assert(entry);
  }
  // 4. Query filtered by employee_id
  const employeeFiltered =
    await api.functional.hrmTimeTracking.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: { employee_id: employeeId },
      },
    );
  typia.assert(employeeFiltered);
  // (a) All entries should belong to the specified employee
  for (const entry of employeeFiltered.data) {
    TestValidator.equals("employee id matches", entry.employee.id, employeeId);
  }
  // 5. Query filtered by new_status
  const statusFiltered =
    await api.functional.hrmTimeTracking.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: { new_status: "completed" },
      },
    );
  typia.assert(statusFiltered);
  // (b) All entries should have new_status === "completed"
  for (const entry of statusFiltered.data) {
    TestValidator.equals(
      "new_status is completed",
      entry.new_status,
      "completed",
    );
  }
  // 6. Query with created_at date range
  const fromDate = allHistory.data[0].created_at;
  const toDate = allHistory.data[allHistory.data.length - 1].created_at;
  const dateFiltered =
    await api.functional.hrmTimeTracking.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          created_at_from: fromDate,
          created_at_to: toDate,
        },
      },
    );
  typia.assert(dateFiltered);
  // (c) All entries should be within the date range
  for (const entry of dateFiltered.data) {
    TestValidator.predicate(
      `entry created_at ${entry.created_at} is within range [${fromDate}, ${toDate}]`,
      entry.created_at >= fromDate && entry.created_at <= toDate,
    );
  }
  // 7. Query with ascending sort
  const sortedAsc =
    await api.functional.hrmTimeTracking.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: { sort: "created_at.asc" },
      },
    );
  typia.assert(sortedAsc);
  // (d) Entries should be in chronological order (oldest first)
  for (let i = 1; i < sortedAsc.data.length; i++) {
    TestValidator.predicate(
      `entry ${i} is after entry ${i - 1}`,
      sortedAsc.data[i - 1].created_at <= sortedAsc.data[i].created_at,
    );
  }
  // 8. Query with pagination (page=1, limit=1)
  const paged =
    await api.functional.hrmTimeTracking.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: { page: 1, limit: 1 },
      },
    );
  typia.assert(paged);
  // (e) Pagination: single entry returned, total records count reflects full dataset
  TestValidator.equals("pagination returns 1 entry", paged.data.length, 1);
  TestValidator.equals(
    "total records matches all history count",
    paged.pagination.records,
    allHistory.pagination.records,
  );
}
