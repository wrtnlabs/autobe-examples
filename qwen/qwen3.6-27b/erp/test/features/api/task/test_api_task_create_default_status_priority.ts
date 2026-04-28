import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
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
 * Test creating a task with only the required title field, verifying default status and priority.
 *
 * Validates that when a task is created with minimal information (title only), the system automatically assigns default values for lifecycle-tracking fields. The task status defaults to 'open' and priority defaults to 'medium' as specified in the database column defaults.
 *
 * This test ensures the core business workflow where new tasks immediately receive a valid lifecycle state and are ready for assignment and work tracking. Response includes the owning project summary, system-generated UUID, and audit timestamps.
 *
 * 1. Member registers on the HRM platform, creating a default organization.
 * 2. Member creates a new project within their organization.
 * 3. Member creates a task with only the required title field.
 * 4. Validates the response contains a generated id, correct title, default status 'open', default priority 'medium', and valid timestamps.
 */
export async function test_api_task_create_default_status_priority(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins the platform
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, { body: {} });
  typia.assert(member);
  // 2. Create a project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    { body: {} },
  );
  typia.assert(project);
  // 3. Create a task with only title (all other fields omitted to test defaults)
  const title = RandomGenerator.paragraph({ sentences: 3 });
  const body = { title } satisfies IHrmPlatformTask.ICreate;
  const task = await api.functional.hrmPlatform.member.projects.tasks.create(
    memberConnection,
    {
      projectId: project.id,
      body,
    },
  );
  typia.assert(task);
  // 4. Validate response
  TestValidator.equals("task title matches input", task.title, title);
  TestValidator.equals("default status is open", task.status, "open");
  TestValidator.equals("default priority is medium", task.priority, "medium");
  TestValidator.predicate(
    "task has valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      task.id,
    ),
  );
  TestValidator.predicate(
    "createdAt is valid date-time",
    new Date(task.createdAt).getTime() > 0,
  );
  TestValidator.predicate(
    "updatedAt is valid date-time",
    new Date(task.updatedAt).getTime() > 0,
  );
  TestValidator.equals(
    "parentTask is null for root-level task",
    task.parentTask,
    null,
  );
  TestValidator.equals(
    "assignedEmployee is null when not assigned",
    task.assignedEmployee,
    null,
  );
  TestValidator.equals(
    "estimatedHours is null when not set",
    task.estimatedHours,
    null,
  );
  TestValidator.equals("dueAt is null when not set", task.dueAt, null);
  TestValidator.equals(
    "task belongs to created project",
    task.project.id,
    project.id,
  );
}
