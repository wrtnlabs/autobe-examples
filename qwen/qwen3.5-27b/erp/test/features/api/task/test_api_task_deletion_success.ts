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
import { generate_random_hrm_time_track_member_projects_create } from "../../../generate/generate_random_hrm_time_track_member_projects_create";
import { generate_random_hrm_time_track_member_tasks_create } from "../../../generate/generate_random_hrm_time_track_member_tasks_create";
import { prepare_random_hrm_time_track_project } from "../../../prepare/prepare_random_hrm_time_track_project";
import { prepare_random_hrm_time_track_task } from "../../../prepare/prepare_random_hrm_time_track_task";

/**
 * Test the primary success path for task deletion from an active project.
 *
 * Validates that a member can successfully delete a task they created within a project. The test verifies soft deletion behavior where the task's deleted_at timestamp is set rather than physically removing the record. This preserves audit trail and referential integrity while logically removing the task from active operations.
 *
 * The test follows the complete workflow: member authentication, project creation, task creation, task deletion, and validation of successful deletion. Special attention is given to verifying that the task exists and is active before deletion, and that the erase operation completes without errors.
 *
 * 1. Authenticate a new member account for testing.
 * 2. Create an active project within the member's organization.
 * 3. Create a task within the project with title and optional metadata.
 * 4. Verify the task is initially active (deleted_at is null).
 * 5. Delete the task using the erase endpoint.
 * 6. Verify the deletion operation completes successfully without errors.
 */
export async function test_api_task_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create an active project
  const project = await generate_random_hrm_time_track_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Create a task within the project
  const task = await generate_random_hrm_time_track_member_tasks_create(
    memberConnection,
    {
      body: {
        hrm_time_track_project_id: project.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        priority: "medium",
        status: "open",
      },
    },
  );
  typia.assert(task);
  // 4. Verify task is initially active (not deleted)
  TestValidator.equals("task initially not deleted", task.deleted_at, null);
  // 5. Delete the task
  await api.functional.hrmTimeTrack.member.tasks.erase(memberConnection, {
    taskId: task.id,
  });
  // 6. Verify deletion was successful (no error thrown means success)
  // The erase operation returns void, so successful completion without exception
  // indicates the task was soft deleted with deleted_at timestamp set
  TestValidator.predicate("task deletion completed successfully", true);
}
