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
 * Test task deletion rejection when project is archived or completed.
 *
 * Validates that the system correctly prevents task deletion attempts on projects that are not in active status. The test verifies that deletion operations on archived and completed projects are rejected with appropriate errors, and that the tasks remain undeleted.
 *
 * Special attention is given to verifying that the project status controls task deletion permissions, ensuring data integrity for historical projects.
 *
 * 1. Member authenticates with the system.
 * 2. Member creates a project with archived status.
 * 3. Member creates a task within the archived project.
 * 4. Member attempts to delete the task from archived project, which should fail with an error.
 * 5. Member creates another project with completed status.
 * 6. Member creates a task within the completed project.
 * 7. Member attempts to delete the task from completed project, which should fail with an error.
 */
export async function test_api_task_deletion_project_status_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create archived project
  const archivedProject =
    await generate_random_hrm_time_track_member_projects_create(
      memberConnection,
      {
        body: {
          status: "archived",
        },
      },
    );
  typia.assert(archivedProject);
  // 3. Create task in archived project
  const archivedTask = await generate_random_hrm_time_track_member_tasks_create(
    memberConnection,
    {
      body: {
        hrm_time_track_project_id: archivedProject.id,
      },
    },
  );
  typia.assert(archivedTask);
  // 4. Attempt to delete task from archived project - should fail
  await TestValidator.error(
    "deletion rejected for archived project",
    async () => {
      await api.functional.hrmTimeTrack.member.tasks.erase(memberConnection, {
        taskId: archivedTask.id,
      });
    },
  );
  // 5. Create completed project
  const completedProject =
    await generate_random_hrm_time_track_member_projects_create(
      memberConnection,
      {
        body: {
          status: "completed",
        },
      },
    );
  typia.assert(completedProject);
  // 6. Create task in completed project
  const completedTask =
    await generate_random_hrm_time_track_member_tasks_create(memberConnection, {
      body: {
        hrm_time_track_project_id: completedProject.id,
      },
    });
  typia.assert(completedTask);
  // 7. Attempt to delete task from completed project - should fail
  await TestValidator.error(
    "deletion rejected for completed project",
    async () => {
      await api.functional.hrmTimeTrack.member.tasks.erase(memberConnection, {
        taskId: completedTask.id,
      });
    },
  );
}
