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

export async function test_api_timer_update_project_task(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member and create organization
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
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
  typia.assert(authorized);
  // 2. Create first project (original association for timer)
  const originalProject =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          color_code: `#${RandomGenerator.alphaNumeric(6)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          budget_hours: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<10>
          >(),
        },
      },
    );
  typia.assert(originalProject);
  // 3. Create task in first project (original association)
  const originalTask = await generate_random_hrm_platform_member_tasks_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(3),
        description: RandomGenerator.paragraph(),
        project_id: originalProject.id,
        priority: RandomGenerator.pick(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
      },
    },
  );
  typia.assert(originalTask);
  // 4. Create second project (new association for timer)
  const newProject = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: `#${RandomGenerator.alphaNumeric(6)}`,
      },
    },
  );
  typia.assert(newProject);
  // 5. Create task in second project (new association)
  const newTask = await generate_random_hrm_platform_member_tasks_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(3),
        description: RandomGenerator.paragraph(),
        project_id: newProject.id,
      },
    },
  );
  typia.assert(newTask);
  // 6. Generate timer ID for update test
  const timerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 7. Update timer with new project and task associations
  const newTaskId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const updatedTimer = await api.functional.hrmPlatform.member.timers.update(
    memberConnection,
    {
      timerId,
      body: {
        hrm_platform_project_id: newProject.id,
        hrm_platform_task_id: newTaskId,
      },
    },
  );
  typia.assert(updatedTimer);
  // 8. Validate update results
  TestValidator.equals(
    "updated timer has new project",
    updatedTimer.hrm_platform_project_id,
    newProject.id,
  );
  TestValidator.equals(
    "updated timer has new task",
    updatedTimer.hrm_platform_task_id,
    newTaskId,
  );
}
