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
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";

/**
 * Test that a project lead can create a subtask under an existing parent task,
 * verifying the one-level subtask hierarchy constraint.
 */
export async function test_api_task_creation_as_subtask_under_parent_task(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Create a project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Create a parent task (not a subtask)
  const parentTask =
    await generate_random_hrm_platform_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          title: "User authentication module",
          description: "Implement user authentication system",
          status: "open",
          priority: "high",
          estimated_hours: 16,
          parent_task_id: null,
        },
      },
    );
  typia.assert(parentTask);
  // Verify parent task has no parent
  TestValidator.equals(
    "parent task has no parent",
    parentTask.parentTask,
    null,
  );
  // 4. Create a subtask under the parent task
  const subtask =
    await generate_random_hrm_platform_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          title: "Implement password hashing",
          description: "Use bcrypt for password encryption",
          status: "open",
          priority: "medium",
          estimated_hours: 4,
          parent_task_id: parentTask.id,
        },
      },
    );
  typia.assert(subtask);
  // Verify subtask response
  TestValidator.equals(
    "subtask has parent task reference",
    subtask.parentTask?.id,
    parentTask.id,
  );
  TestValidator.equals(
    "subtask title matches input",
    subtask.title,
    "Implement password hashing",
  );
  TestValidator.equals(
    "subtask description matches input",
    subtask.description,
    "Use bcrypt for password encryption",
  );
  TestValidator.equals(
    "subtask priority matches input",
    subtask.priority,
    "medium",
  );
  TestValidator.equals(
    "subtask estimated hours matches input",
    subtask.estimated_hours,
    4,
  );
  TestValidator.equals(
    "subtask belongs to same project",
    subtask.project.id,
    project.id,
  );
  // 5. Attempt to create a nested subtask (subtask of a subtask)
  // This should be rejected because subtasks cannot have their own subtasks
  await TestValidator.error("cannot create subtask of a subtask", async () => {
    await generate_random_hrm_platform_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          title: "Choose bcrypt cost factor",
          description: "Determine optimal bcrypt cost factor",
          status: "open",
          priority: "low",
          estimated_hours: 2,
          parent_task_id: subtask.id, // This should fail - subtask cannot have subtasks
        },
      },
    );
  });
}
