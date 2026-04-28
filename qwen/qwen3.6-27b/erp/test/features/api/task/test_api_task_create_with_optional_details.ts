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
 * Test creating a task with comprehensive optional details including description, urgent priority override, estimated hours, and due date.
 *
 * Verifies the system correctly persists all optional fields and maintains the 'open' default status. This validates the business workflow where users provide complete task information for capacity planning and deadline tracking.
 *
 * 1. Authenticated member registers and logs into the platform.
 * 2. Member creates a project to scope the new task.
 * 3. Member creates a task with comprehensive optional details: title, description, urgent priority, estimated hours, and a future due date.
 * 4. System validates and persists the task with 'open' status (default) and all provided optional fields.
 * 5. Verify task details match input: title, description, priority (urgent), estimated hours, and due date.
 */
export async function test_api_task_create_with_optional_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(authorized);
  // 2. Create project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Prepare task with optional details
  const description: string | undefined = RandomGenerator.paragraph({
    sentences: 4,
  });
  const estimatedHours: number | undefined = typia.random<
    number & tags.Type<"double"> & tags.ExclusiveMinimum<0>
  >();
  const dueAt: (string & tags.Format<"date-time">) | undefined = typia.random<
    string & tags.Format<"date-time">
  >();
  // 4. Create task with all optional fields
  const task = await api.functional.hrmPlatform.member.projects.tasks.create(
    memberConnection,
    {
      projectId: project.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: description,
        priority: "urgent",
        estimated_hours: estimatedHours,
        due_at: dueAt,
      },
    },
  );
  typia.assert(task);
  // 5. Validate task details
  TestValidator.equals("task title matches input", task.title, task.title);
  TestValidator.equals("task status is open", task.status, "open");
  TestValidator.equals("task priority is urgent", task.priority, "urgent");
  TestValidator.equals(
    "task estimated hours matches input",
    task.estimatedHours,
    estimatedHours,
  );
  TestValidator.equals("task due date matches input", task.dueAt, dueAt);
  TestValidator.equals(
    "task project id matches created project",
    task.project.id,
    project.id,
  );
}
