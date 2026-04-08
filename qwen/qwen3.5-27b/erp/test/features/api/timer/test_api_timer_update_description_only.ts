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
import type { IHrmTimeTrackTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimer";
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
import { generate_random_hrm_time_track_member_timers_create } from "../../../generate/generate_random_hrm_time_track_member_timers_create";
import { prepare_random_hrm_time_track_employee } from "../../../prepare/prepare_random_hrm_time_track_employee";
import { prepare_random_hrm_time_track_organization } from "../../../prepare/prepare_random_hrm_time_track_organization";
import { prepare_random_hrm_time_track_project } from "../../../prepare/prepare_random_hrm_time_track_project";
import { prepare_random_hrm_time_track_project_member } from "../../../prepare/prepare_random_hrm_time_track_project_member";
import { prepare_random_hrm_time_track_timer } from "../../../prepare/prepare_random_hrm_time_track_timer";

/**
 * Test updating only the description field of a running timer while preserving all other attributes.
 *
 * Validates that updating a timer's description field does not affect other timer properties such as the start timestamp, active status, or project/task associations. The timer should continue running uninterrupted while the description is modified.
 *
 * Special attention is given to verifying that the started_at timestamp remains unchanged (ensuring elapsed time continues accumulating correctly) and that project/task associations are preserved. The updated_at timestamp should reflect the modification time.
 *
 * 1. Authenticate as a member to access timer operations.
 * 2. Create an organization context for employee and project.
 * 3. Create an employee record linking member to organization.
 * 4. Create a project for time tracking.
 * 5. Assign the employee to the project for access.
 * 6. Start a timer for that project with an initial description.
 * 7. Capture the original timer state including started_at, is_active, and associations.
 * 8. Update only the description field of the running timer.
 * 9. Verify the updated timer has the new description.
 * 10. Verify started_at timestamp remains unchanged.
 * 11. Verify is_active remains true (timer continues running).
 * 12. Verify project_id and task_id associations are unchanged.
 * 13. Verify updated_at timestamp is newer than the original.
 */
export async function test_api_timer_update_description_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member and capture authorization response
  const memberConnection: api.IConnection = { host: connection.host };
  const authorization = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(authorization);
  // 2. Create organization
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create employee for the member using the member id from authorization
  const employee = await generate_random_hrm_time_track_member_employees_create(
    memberConnection,
    {
      body: {
        hrm_time_track_member_id: authorization.id,
      },
    },
  );
  typia.assert(employee);
  // 4. Create project
  const project = await generate_random_hrm_time_track_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 5. Assign employee to project
  await generate_random_hrm_time_track_member_projects_members_create(
    memberConnection,
    {
      params: {
        projectId: project.id,
      },
      body: {
        employee_id: employee.id,
      },
    },
  );
  // 6. Start a timer with initial description
  const initialDescription = RandomGenerator.paragraph({ sentences: 3 });
  const timer = await generate_random_hrm_time_track_member_timers_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        description: initialDescription,
      },
    },
  );
  typia.assert(timer);
  // Capture original state
  const originalStartedAt = timer.started_at;
  const originalUpdatedAt = timer.updated_at;
  const originalProjectId = timer.project.id;
  const originalTaskId = timer.task?.id ?? null;
  const originalIsActive = timer.is_active;
  // 7. Update only the description field
  const newDescription = RandomGenerator.paragraph({ sentences: 5 });
  const updatedTimer = await api.functional.hrmTimeTrack.member.timers.update(
    memberConnection,
    {
      timerId: timer.id,
      body: {
        description: newDescription,
      } satisfies IHrmTimeTrackTimer.IUpdate,
    },
  );
  typia.assert(updatedTimer);
  // 8. Verify description was updated
  TestValidator.equals(
    "description updated to new value",
    updatedTimer.description,
    newDescription,
  );
  // 9. Verify started_at timestamp remains unchanged
  TestValidator.equals(
    "started_at timestamp preserved",
    updatedTimer.started_at,
    originalStartedAt,
  );
  // 10. Verify is_active remains true (timer continues running)
  TestValidator.equals("timer remains active", updatedTimer.is_active, true);
  TestValidator.equals(
    "is_active unchanged from original",
    updatedTimer.is_active,
    originalIsActive,
  );
  // 11. Verify project association unchanged
  TestValidator.equals(
    "project association preserved",
    updatedTimer.project.id,
    originalProjectId,
  );
  // 12. Verify task association unchanged
  TestValidator.equals(
    "task association preserved",
    updatedTimer.task?.id ?? null,
    originalTaskId,
  );
  // 13. Verify updated_at is newer than original
  TestValidator.predicate(
    "updated_at timestamp is newer",
    new Date(updatedTimer.updated_at).getTime() >
      new Date(originalUpdatedAt).getTime(),
  );
}
