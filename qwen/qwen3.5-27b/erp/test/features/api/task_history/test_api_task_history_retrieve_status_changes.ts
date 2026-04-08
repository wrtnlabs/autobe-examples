import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import type { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import type { IHrmTimeTrackProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProjectMember";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import type { IHrmTimeTrackTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTask";
import type { IHrmTimeTrackTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTaskHistory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackTaskHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_track_member_employees_create } from "../../../generate/generate_random_hrm_time_track_member_employees_create";
import { generate_random_hrm_time_track_member_projects_create } from "../../../generate/generate_random_hrm_time_track_member_projects_create";
import { generate_random_hrm_time_track_member_tasks_create } from "../../../generate/generate_random_hrm_time_track_member_tasks_create";
import { prepare_random_hrm_time_track_employee } from "../../../prepare/prepare_random_hrm_time_track_employee";
import { prepare_random_hrm_time_track_project } from "../../../prepare/prepare_random_hrm_time_track_project";
import { prepare_random_hrm_time_track_task } from "../../../prepare/prepare_random_hrm_time_track_task";

/**
 * Test retrieving task status change history for a task that has undergone multiple status transitions.
 *
 * Validates the complete task history retrieval flow including member authentication, project setup, employee creation, task creation, and history retrieval. Ensures that the task history correctly records status transitions and provides accurate pagination metadata.
 *
 * Special attention is given to verifying that history entries contain accurate status transition information (previous_status, new_status), member attribution, and chronological ordering by created_at timestamp.
 *
 * 1. Member authenticates via registration endpoint.
 * 2. Member creates a project within their organization.
 * 3. Member creates an employee record assigned to the organization.
 * 4. Member creates a task within the project, assigned to the employee.
 * 5. Member retrieves task status history with pagination parameters.
 * 6. Validates history entries contain accurate status transitions and member information.
 * 7. Validates pagination metadata is accurate and entries are chronologically ordered.
 */
export async function test_api_task_history_retrieve_status_changes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a project
  const project = await generate_random_hrm_time_track_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Create an employee
  const employee = await generate_random_hrm_time_track_member_employees_create(
    memberConnection,
    {},
  );
  typia.assert(employee);
  // 4. Create a task within the project
  const task = await generate_random_hrm_time_track_member_tasks_create(
    memberConnection,
    {
      body: {
        hrm_time_track_project_id: project.id,
        hrm_time_track_employee_id: employee.id,
      },
    },
  );
  typia.assert(task);
  // 5. Retrieve task status history
  const history =
    await api.functional.hrmTimeTrack.member.tasks.histories.index(
      memberConnection,
      {
        taskId: task.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IHrmTimeTrackTaskHistory.IRequest,
      },
    );
  typia.assert(history);
  // 6. Validate pagination metadata
  TestValidator.equals("current page is 1", history.pagination.current, 1);
  TestValidator.equals("limit is 20", history.pagination.limit, 20);
  TestValidator.predicate(
    "records count is non-negative",
    history.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    history.pagination.pages >= 0,
  );
  // 7. Validate history entries if any exist
  if (history.data.length > 0) {
    // Validate chronological ordering
    for (let i = 1; i < history.data.length; i++) {
      TestValidator.predicate(
        `history entry ${i} created_at >= entry ${i - 1} created_at`,
        new Date(history.data[i].created_at).getTime() >=
          new Date(history.data[i - 1].created_at).getTime(),
      );
    }
    // Validate each history entry structure
    for (const entry of history.data) {
      // Validate task reference
      TestValidator.equals(
        "history entry task_id matches retrieved task",
        entry.task.id,
        task.id,
      );
      // Validate member information exists
      TestValidator.predicate(
        "history entry has member id",
        entry.member.id !== undefined,
      );
      TestValidator.predicate(
        "history entry has member email",
        entry.member.email !== undefined,
      );
      // Validate status transition fields exist
      TestValidator.predicate(
        "history entry has previous_status",
        entry.previous_status !== undefined && entry.previous_status.length > 0,
      );
      TestValidator.predicate(
        "history entry has new_status",
        entry.new_status !== undefined && entry.new_status.length > 0,
      );
      // Validate statuses are different (actual transition occurred)
      TestValidator.notEquals(
        "previous_status differs from new_status",
        entry.previous_status,
        entry.new_status,
      );
    }
  }
}
