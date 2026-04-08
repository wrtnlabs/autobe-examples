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
 * Test retrieving task status change history for a newly created task with no status changes.
 *
 * Validates that when a task is created without any status modifications, the task history endpoint returns an empty paginated result. This ensures the system correctly handles tasks with no audit trail entries and provides proper pagination metadata for empty datasets.
 *
 * The test creates a complete workflow including member authentication, project creation, employee creation, and task creation. After establishing the task with its default status, it retrieves the history without any filters to verify the empty result handling.
 *
 * Special attention is given to validating that the pagination metadata correctly reflects zero records and zero pages, while maintaining proper page structure.
 *
 * 1. Authenticate as a member to access the HRM time tracking system.
 * 2. Create a project as the parent container for the task.
 * 3. Create an employee to be assigned to the task.
 * 4. Create a task within the project (task will have default status 'open' with no history).
 * 5. Retrieve task history without any filters.
 * 6. Validate that the response contains an empty data array.
 * 7. Validate pagination metadata shows zero records and zero pages.
 */
export async function test_api_task_history_empty_result(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create a project
  const project = await generate_random_hrm_time_track_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(project);
  // 3. Create an employee
  const employee = await generate_random_hrm_time_track_member_employees_create(
    memberConnection,
    {
      body: {
        position: RandomGenerator.name(),
      },
    },
  );
  typia.assert(employee);
  // 4. Create a task within the project
  const task = await generate_random_hrm_time_track_member_tasks_create(
    memberConnection,
    {
      body: {
        hrm_time_track_project_id: project.id,
        hrm_time_track_employee_id: employee.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(task);
  // 5. Retrieve task history without filters
  const history =
    await api.functional.hrmTimeTrack.member.tasks.histories.index(
      memberConnection,
      {
        taskId: task.id,
        body: {},
      },
    );
  typia.assert(history);
  // 6. Validate empty data array
  TestValidator.equals("history data is empty", history.data.length, 0);
  // 7. Validate pagination metadata
  TestValidator.equals("current page is 1", history.pagination.current, 1);
  TestValidator.equals("records count is 0", history.pagination.records, 0);
  TestValidator.equals("pages count is 0", history.pagination.pages, 0);
}
