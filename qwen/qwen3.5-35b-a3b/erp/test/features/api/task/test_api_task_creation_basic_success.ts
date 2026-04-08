import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_tasks_create } from "../../../generate/generate_random_hrm_platform_member_tasks_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";

export async function test_api_task_creation_basic_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member join to establish authentication and organization context
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: "USD",
      org_description: RandomGenerator.paragraph(),
      org_logo_uri: typia.random<string & tags.Format<"uri">>(),
      org_timezone: "Asia/Seoul",
      org_fiscal_month: 1,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(joinResult);
  const userConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${joinResult.token.access}` },
  };
  // 2. Create a project (required prerequisite for task creation)
  const project = await api.functional.hrmPlatform.member.projects.create(
    userConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: `#${RandomGenerator.alphaNumeric(6).toUpperCase()}`,
        description: RandomGenerator.paragraph(),
        budget_hours: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<0>
        >(),
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 3. Create task with minimal required fields
  const taskTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const task = await api.functional.hrmPlatform.member.tasks.create(
    userConnection,
    {
      body: {
        title: taskTitle,
        project_id: project.id,
      } satisfies IHrmPlatformTask.ICreate,
    },
  );
  typia.assert(task);
  // 4. Validate task response fields - using type assertion to access full entity
  const taskEntity = typia.assert<
    typeof task & {
      id: string & tags.Format<"uuid">;
      title: string;
      status: string;
      priority: string;
      created_at: string & tags.Format<"date-time">;
      updated_at: string & tags.Format<"date-time">;
      deleted_at: (string & tags.Format<"date-time">) | null;
      description: string | null | undefined;
      assignedEmployee: IHrmPlatformEmployee.ISummary | null | undefined;
      parentTask: IHrmPlatformTask.ISummary | null | undefined;
      estimated_hours: number | undefined;
      due_date: (string & tags.Format<"date-time">) | undefined;
      project: IHrmPlatformProject.ISummary;
    }
  >(task);
  // Validate basic task fields
  TestValidator.equals("task title", taskEntity.title, taskTitle);
  TestValidator.equals("task status", taskEntity.status, "TODO");
  TestValidator.equals("task priority", taskEntity.priority, "MEDIUM");
  // Validate timestamps are valid date-time format
  const createdDate = new Date(taskEntity.created_at);
  const updatedDate = new Date(taskEntity.updated_at);
  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(createdDate.getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid date",
    !isNaN(updatedDate.getTime()),
  );
  // Validate deleted_at is null (active task)
  TestValidator.equals("deleted_at is null", taskEntity.deleted_at, null);
  // Validate optional fields are null
  TestValidator.equals("description is null", taskEntity.description, null);
  TestValidator.equals(
    "assignedEmployee is null",
    taskEntity.assignedEmployee,
    null,
  );
  TestValidator.equals("parentTask is null", taskEntity.parentTask, null);
  TestValidator.equals(
    "estimated_hours is null",
    taskEntity.estimated_hours,
    null,
  );
  TestValidator.equals("due_date is null", taskEntity.due_date, null);
  // Validate project reference contains correct data
  TestValidator.equals("project id", taskEntity.project.id, project.id);
  TestValidator.equals("project name", taskEntity.project.name, project.name);
  TestValidator.equals(
    "project status",
    taskEntity.project.status,
    project.status,
  );
  TestValidator.equals(
    "project color_code",
    taskEntity.project.color_code,
    project.color_code,
  );
}
