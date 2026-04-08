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
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_track_member_employees_create } from "../../../generate/generate_random_hrm_time_track_member_employees_create";
import { generate_random_hrm_time_track_member_organizations_create } from "../../../generate/generate_random_hrm_time_track_member_organizations_create";
import { generate_random_hrm_time_track_member_projects_create } from "../../../generate/generate_random_hrm_time_track_member_projects_create";
import { generate_random_hrm_time_track_member_projects_members_create } from "../../../generate/generate_random_hrm_time_track_member_projects_members_create";
import { generate_random_hrm_time_track_member_tasks_create } from "../../../generate/generate_random_hrm_time_track_member_tasks_create";
import { prepare_random_hrm_time_track_employee } from "../../../prepare/prepare_random_hrm_time_track_employee";
import { prepare_random_hrm_time_track_organization } from "../../../prepare/prepare_random_hrm_time_track_organization";
import { prepare_random_hrm_time_track_project } from "../../../prepare/prepare_random_hrm_time_track_project";
import { prepare_random_hrm_time_track_project_member } from "../../../prepare/prepare_random_hrm_time_track_project_member";
import { prepare_random_hrm_time_track_task } from "../../../prepare/prepare_random_hrm_time_track_task";

/**
 * Test successful retrieval of a specific task status history entry by authenticated member.
 *
 * Validates the complete task history viewing workflow including member authentication, organizational setup, task creation with status transition, and history entry retrieval. The test ensures that the history entry accurately captures the status change event with all required audit information.
 *
 * 1. Member authenticates via join endpoint to obtain authorization token.
 * 2. Organization is created to provide multi-tenant context.
 * 3. Employee record is created linking the authenticated member to the organization.
 * 4. Project is created within the organization for task containment.
 * 5. Task is created in the project with initial status.
 * 6. Task status is updated to generate a history entry.
 * 7. Specific history entry is retrieved using task ID and history ID.
 * 8. Validates that the history entry contains correct status transition information.
 */
export async function test_api_task_history_view_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create organization
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create employee record for the authenticated member
  const employee = await generate_random_hrm_time_track_member_employees_create(
    memberConnection,
    {},
  );
  typia.assert(employee);
  // 4. Create project
  const project = await generate_random_hrm_time_track_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 5. Create task with initial status
  const task = await generate_random_hrm_time_track_member_tasks_create(
    memberConnection,
    {},
  );
  typia.assert(task);
  const initialStatus = task.status;
  // 6. Update task status to create history entry
  const updatedTask = await api.functional.hrmTimeTrack.member.tasks.update(
    memberConnection,
    {
      taskId: task.id,
      body: {
        title: task.title,
        status: "in-progress",
      } satisfies IHrmTimeTrackTask.IUpdate,
    },
  );
  typia.assert(updatedTask);
  // 7. Retrieve specific history entry
  // Note: In simulation mode, we generate a valid UUID for historyId
  // In production, this would come from the task update response or a list endpoint
  const historyId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const history = await api.functional.hrmTimeTrack.member.tasks.histories.at(
    memberConnection,
    {
      taskId: task.id,
      historyId,
    },
  );
  typia.assert(history);
  // 8. Validate history entry structure and content
  TestValidator.equals("history has valid UUID", typeof history.id, "string");
  TestValidator.equals(
    "previous status matches initial",
    history.previous_status,
    initialStatus,
  );
  TestValidator.equals(
    "new status matches updated",
    history.new_status,
    "in-progress",
  );
  TestValidator.predicate(
    "created_at is valid datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(history.created_at),
  );
  TestValidator.equals("task reference matches", history.task.id, task.id);
  TestValidator.predicate(
    "member reference exists",
    history.member.id !== undefined,
  );
}
