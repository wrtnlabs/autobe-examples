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
 * Test retrieving a task by its unique identifier when the authenticated member has proper project membership access.
 * Verifies task details, related data joins, soft-deletion status, optional field handling, schema compliance,
 * and project membership access control.
 */
export async function test_api_task_retrieve_by_member_with_project_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a project (member becomes project member automatically)
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Create a task within the project
  const task = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {},
    },
  );
  typia.assert(task);
  // 4. Retrieve the task by ID
  const retrievedTask = await api.functional.hrmPlatform.member.tasks.at(
    memberConnection,
    {
      taskId: task.id,
    },
  );
  typia.assert(retrievedTask);
  // 5. Validate business logic
  TestValidator.equals("task ID matches", retrievedTask.id, task.id);
  TestValidator.equals("task title matches", retrievedTask.title, task.title);
  TestValidator.equals(
    "project reference correct",
    retrievedTask.project.id,
    project.id,
  );
  TestValidator.equals(
    "creator is authenticated member",
    retrievedTask.createdByMember.id,
    member.id,
  );
  TestValidator.predicate(
    "task is not soft-deleted",
    retrievedTask.deleted_at === null,
  );
  TestValidator.predicate(
    "has valid created_at",
    retrievedTask.created_at !== null,
  );
  TestValidator.predicate(
    "has valid updated_at",
    retrievedTask.updated_at !== null,
  );
  TestValidator.predicate(
    "status is valid",
    ["open", "in-progress", "completed", "closed"].includes(
      retrievedTask.status,
    ),
  );
  TestValidator.predicate(
    "priority is valid",
    ["low", "medium", "high", "urgent"].includes(retrievedTask.priority),
  );
}
