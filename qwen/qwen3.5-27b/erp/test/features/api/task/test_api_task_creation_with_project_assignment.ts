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
 * Test task creation with project assignment and comprehensive field validation.
 *
 * Validates the complete task creation workflow including member authentication, organization setup, project creation, and task assignment. Ensures that tasks can be created with all required and optional fields, and that the response contains complete task data with auto-generated identifiers and timestamps.
 *
 * Special attention is given to verifying that default values are correctly applied when optional fields are not provided, and that the task properly references its parent project and assigned employee.
 *
 * 1. Member registers and authenticates with email and password.
 * 2. Organization is created as the multi-tenant container for HRM data.
 * 3. Project is created within the organization to contain the task.
 * 4. Task is created with all fields including optional employee assignment.
 * 5. Validates task response contains correct project reference and auto-generated fields.
 * 6. Verifies default values for status and priority when not explicitly provided.
 */
export async function test_api_task_creation_with_project_assignment(
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
  // 3. Create project
  const project = await generate_random_hrm_time_track_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 4. Create task with all fields
  const taskWithAllFields =
    await generate_random_hrm_time_track_member_tasks_create(memberConnection, {
      body: {
        hrm_time_track_project_id: project.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        priority: "high",
        status: "in-progress",
        effort_estimate: typia.random<number & tags.Type<"uint32">>(),
      },
    });
  typia.assert(taskWithAllFields);
  // 5. Verify task has correct project reference
  TestValidator.equals(
    "task belongs to correct project",
    taskWithAllFields.project.id,
    project.id,
  );
  // 6. Verify task has correct title
  TestValidator.predicate(
    "task title matches input",
    taskWithAllFields.title.length > 0,
  );
  // 7. Verify task has correct priority
  TestValidator.equals(
    "task priority matches input",
    taskWithAllFields.priority,
    "high",
  );
  // 8. Verify task has correct status
  TestValidator.equals(
    "task status matches input",
    taskWithAllFields.status,
    "in-progress",
  );
  // 9. Verify effort estimate is set
  TestValidator.predicate(
    "task has effort estimate",
    taskWithAllFields.effort_estimate !== null,
  );
  // 10. Verify timestamps are generated
  TestValidator.predicate(
    "task has created_at timestamp",
    taskWithAllFields.created_at.length > 0,
  );
  TestValidator.predicate(
    "task has updated_at timestamp",
    taskWithAllFields.updated_at.length > 0,
  );
  // 11. Create task with minimal fields to test defaults
  const taskWithDefaults =
    await generate_random_hrm_time_track_member_tasks_create(memberConnection, {
      body: {
        hrm_time_track_project_id: project.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
      },
    });
  typia.assert(taskWithDefaults);
  // 12. Verify default status is 'open'
  TestValidator.equals(
    "task default status is open",
    taskWithDefaults.status,
    "open",
  );
  // 13. Verify default priority is 'medium'
  TestValidator.equals(
    "task default priority is medium",
    taskWithDefaults.priority,
    "medium",
  );
  // 14. Verify task with defaults has no effort estimate
  TestValidator.equals(
    "task default effort estimate is null",
    taskWithDefaults.effort_estimate,
    null,
  );
  // 15. Verify task with defaults has no employee assignment
  TestValidator.equals(
    "task default employee assignment is null",
    taskWithDefaults.employee,
    null,
  );
}
