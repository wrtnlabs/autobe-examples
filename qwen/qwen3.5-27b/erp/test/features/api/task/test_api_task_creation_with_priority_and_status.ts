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
 * Test task creation with various priority levels and status values.
 *
 * Validates that the system correctly handles different priority classifications (low, medium, high, urgent) and workflow states (open, in-progress, completed, closed) during task creation. The test creates multiple tasks with explicit priority and status values, then verifies that the response contains the correct values. Additionally, tests default value assignment when priority and status fields are omitted.
 *
 * 1. Authenticate as a member and create organization context.
 * 2. Create a project to contain the test tasks.
 * 3. Create tasks with various priority and status combinations.
 * 4. Validate that each task's priority and status match the input values.
 * 5. Test default value assignment for omitted fields.
 */
export async function test_api_task_creation_with_priority_and_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create organization
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      { body: {} },
    );
  typia.assert(organization);
  // 3. Create project
  const project =
    await generate_random_hrm_time_track_member_projects_create(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(project);
  // 4. Define priority and status combinations to test
  const priorities = ["low", "medium", "high", "urgent"] as const;
  const statuses = ["open", "in-progress", "completed", "closed"] as const;
  // 5. Create tasks with different priority and status combinations
  await ArrayUtil.asyncForEach(priorities, async (priority) => {
    await ArrayUtil.asyncForEach(statuses, async (status) => {
      const task = await generate_random_hrm_time_track_member_tasks_create(
        memberConnection,
        {
          body: {
            hrm_time_track_project_id: project.id,
            title: `Task with ${priority} priority and ${status} status`,
            priority: priority,
            status: status,
          },
        },
      );
      typia.assert(task);
      // 6. Validate priority and status match input
      TestValidator.equals(
        `priority matches for ${priority}-${status}`,
        task.priority,
        priority,
      );
      TestValidator.equals(
        `status matches for ${priority}-${status}`,
        task.status,
        status,
      );
    });
  });
  // 7. Test default values (priority should default to 'medium', status to 'open')
  const defaultTask = await generate_random_hrm_time_track_member_tasks_create(
    memberConnection,
    {
      body: {
        hrm_time_track_project_id: project.id,
        title: "Task with default priority and status",
      },
    },
  );
  typia.assert(defaultTask);
  TestValidator.equals(
    "default priority is medium",
    defaultTask.priority,
    "medium",
  );
  TestValidator.equals("default status is open", defaultTask.status, "open");
}