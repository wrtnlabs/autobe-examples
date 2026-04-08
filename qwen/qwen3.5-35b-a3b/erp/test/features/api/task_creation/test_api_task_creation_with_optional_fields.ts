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

export async function test_api_task_creation_with_optional_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as member to establish authentication and organization context
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      org_logo_uri: typia.random<string & tags.Format<"uri">>(),
      org_timezone: RandomGenerator.pick([
        "UTC",
        "Asia/Seoul",
        "America/New_York",
      ]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(joinResult);
  // 2. Create a project within the organization
  const projectConnection: api.IConnection = { host: connection.host };
  const project = await api.functional.hrmPlatform.member.projects.create(
    projectConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        color_code: `#${RandomGenerator.alphaNumeric(6).toUpperCase()}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        budget_hours: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<10>
        >(),
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 3. Create a task with all optional fields populated
  const taskConnection: api.IConnection = { host: connection.host };
  const title = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 4,
    wordMax: 8,
  });
  const description = RandomGenerator.paragraph({ sentences: 3 });
  const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days from now
  const task = await api.functional.hrmPlatform.member.tasks.create(
    taskConnection,
    {
      body: {
        title,
        description,
        project_id: project.id,
        priority: "HIGH",
        estimated_hours: 40,
        due_date: dueDate,
      } satisfies IHrmPlatformTask.ICreate,
    },
  );
  typia.assert(task);
  // 4. Validate the response
  TestValidator.equals("task priority is HIGH", task.priority, "HIGH");
  TestValidator.equals("task status is TODO", task.status, "TODO");
}