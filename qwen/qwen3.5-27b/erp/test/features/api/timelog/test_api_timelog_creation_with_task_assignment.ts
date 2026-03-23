import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_member_projects_tasks_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

/**
 * Test timelog creation with task assignment validation.
 *
 * 1. Authenticate member to establish session context
 * 2. Create two projects to test cross-project task validation
 * 3. Create a task in the first project
 * 4. Create a timelog with valid task assignment (same project)
 * 5. Verify timelog includes nested task information
 * 6. Create a timelog without task assignment (task_id null)
 * 7. Verify task_id is optional and timelog is created successfully
 */
export async function test_api_timelog_creation_with_task_assignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create first project
  const project1 = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: { name: "Project Alpha", status: "active", color_code: "#FF5733" },
    },
  );
  typia.assert(project1);
  // 3. Create second project for cross-project validation
  const project2 = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    { body: { name: "Project Beta", status: "active", color_code: "#33FF57" } },
  );
  typia.assert(project2);
  // 4. Create a task in the first project
  const task1 = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project1.id },
      body: {
        title: "Task in Project Alpha",
        status: "open",
        priority: "high",
      },
    },
  );
  typia.assert(task1);
  // 5. Create a task in the second project (for cross-project validation)
  const task2 = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project2.id },
      body: {
        title: "Task in Project Beta",
        status: "open",
        priority: "medium",
      },
    },
  );
  typia.assert(task2);
  // 6. Create timelog with valid task assignment (task belongs to same project)
  const timelogWithTask =
    await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          project_id: project1.id,
          task_id: task1.id,
          date: new Date().toISOString(),
          duration: 480,
          billable: true,
          description: "Worked on Project Alpha task",
        },
      },
    );
  typia.assert(timelogWithTask);
  // 7. Verify timelog includes nested task information
  TestValidator.equals(
    "timelog project matches",
    timelogWithTask.project.id,
    project1.id,
  );
  TestValidator.equals(
    "timelog task matches",
    timelogWithTask.task?.id,
    task1.id,
  );
  TestValidator.equals(
    "timelog task title matches",
    timelogWithTask.task?.title,
    task1.title,
  );
  TestValidator.predicate(
    "timelog has valid duration",
    timelogWithTask.duration > 0,
  );
  TestValidator.equals("timelog is billable", timelogWithTask.billable, true);
  // 8. Create timelog without task assignment (task_id is null)
  const timelogWithoutTask =
    await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          project_id: project1.id,
          task_id: null,
          date: new Date().toISOString(),
          duration: 240,
          billable: false,
          description: "General work on Project Alpha",
        },
      },
    );
  typia.assert(timelogWithoutTask);
  // 9. Verify timelog without task is created successfully
  TestValidator.equals(
    "timelog project matches",
    timelogWithoutTask.project.id,
    project1.id,
  );
  TestValidator.equals("timelog task is null", timelogWithoutTask.task, null);
  TestValidator.predicate(
    "timelog has valid duration",
    timelogWithoutTask.duration > 0,
  );
  TestValidator.equals(
    "timelog is not billable",
    timelogWithoutTask.billable,
    false,
  );
  // 10. Test cross-project task validation (should fail)
  await TestValidator.error("cross-project task rejected", async () => {
    await generate_random_hrm_platform_member_timelogs_create(
      memberConnection,
      {
        body: {
          project_id: project1.id,
          task_id: task2.id, // task2 belongs to project2, not project1
          date: new Date().toISOString(),
          duration: 120,
          billable: true,
          description: "Invalid cross-project assignment",
        },
      },
    );
  });
}
