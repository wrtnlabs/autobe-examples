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
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_track_member_organizations_create } from "../../../generate/generate_random_hrm_time_track_member_organizations_create";
import { generate_random_hrm_time_track_member_projects_create } from "../../../generate/generate_random_hrm_time_track_member_projects_create";
import { generate_random_hrm_time_track_member_tasks_create } from "../../../generate/generate_random_hrm_time_track_member_tasks_create";
import { prepare_random_hrm_time_track_organization } from "../../../prepare/prepare_random_hrm_time_track_organization";
import { prepare_random_hrm_time_track_project } from "../../../prepare/prepare_random_hrm_time_track_project";
import { prepare_random_hrm_time_track_task } from "../../../prepare/prepare_random_hrm_time_track_task";

/**
 * Test the primary success path for updating a task's core attributes by a project lead.
 *
 * Validates the complete task update workflow including member authentication, organization and project setup, task creation, and task modification. Ensures that the task is successfully updated with new values, the updated_at timestamp is refreshed, and the response includes the complete updated task entity with all relationships.
 *
 * Special attention is given to verifying that the project lead has appropriate permissions to modify tasks in their assigned project, and that the update operation correctly captures all changes including status transitions.
 *
 * 1. Authenticate as member to access task management functionality.
 * 2. Create organization context for task management.
 * 3. Create project containing the task to be updated.
 * 4. Create initial task with specific attributes (title, description, status, priority).
 * 5. Update the task with new values for title, description, status, and priority.
 * 6. Validate that the task is successfully updated with new values.
 * 7. Verify that the updated_at timestamp is refreshed.
 * 8. Confirm that the response includes the complete updated task entity with all relationships.
 */
export async function test_api_task_update_by_project_lead(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackMember.IJoin,
  });
  // 2. Create organization
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create project
  const project = await generate_random_hrm_time_track_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 4. Create initial task
  const initialTask = await generate_random_hrm_time_track_member_tasks_create(
    memberConnection,
    {
      body: {
        hrm_time_track_project_id: project.id,
        title: "Initial Task Title",
        description: "Initial task description",
        priority: "medium",
        status: "open",
      } satisfies IHrmTimeTrackTask.ICreate,
    },
  );
  typia.assert(initialTask);
  // Store initial updated_at for comparison
  const initialUpdatedAt = initialTask.updated_at;
  // 5. Update the task with new values
  const updatedTask = await api.functional.hrmTimeTrack.member.tasks.update(
    memberConnection,
    {
      taskId: initialTask.id,
      body: {
        title: "Updated Task Title",
        description: "Updated task description with more details",
        status: "in-progress",
        priority: "high",
      } satisfies IHrmTimeTrackTask.IUpdate,
    },
  );
  typia.assert(updatedTask);
  // 6. Validate that the task ID remains consistent
  TestValidator.equals("task ID unchanged", updatedTask.id, initialTask.id);
  // 7. Validate that the task is successfully updated with new values
  TestValidator.equals(
    "title updated",
    updatedTask.title,
    "Updated Task Title",
  );
  TestValidator.equals(
    "description updated",
    updatedTask.description,
    "Updated task description with more details",
  );
  TestValidator.equals("status updated", updatedTask.status, "in-progress");
  TestValidator.equals("priority updated", updatedTask.priority, "high");
  // 8. Verify that the updated_at timestamp is refreshed
  TestValidator.notEquals(
    "updated_at refreshed",
    initialUpdatedAt,
    updatedTask.updated_at,
  );
  // 9. Confirm that the project relationship is maintained
  TestValidator.equals(
    "project relationship maintained",
    updatedTask.project.id,
    project.id,
  );
}
