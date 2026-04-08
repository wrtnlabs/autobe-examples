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
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";

export async function test_api_project_update_success_path(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      org_logo_uri: typia.random<string & tags.Format<"uri">>(),
      org_timezone: RandomGenerator.pick(["UTC", "Asia/Seoul"]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create a project with initial values
  const originalProject =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 4,
            wordMax: 8,
          }),
          color_code: typia.random<string>(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          budget_hours: typia.random<
            number & tags.Minimum<10> & tags.Maximum<5000>
          >(),
          start_date: RandomGenerator.date(
            new Date(),
            86400000 * 7,
          ).toISOString(),
          end_date: RandomGenerator.date(
            new Date(),
            86400000 * 30,
          ).toISOString(),
        },
      },
    );
  typia.assert(originalProject);
  // 3. Store original values and timestamps
  const originalCreatedAt = originalProject.created_at;
  const originalUpdatedAt = originalProject.updated_at;
  const originalTaskIds = new Set(originalProject.tasks.map((t) => t.id));
  const originalTimelogIds = new Set(originalProject.timelogs.map((t) => t.id));
  const originalTimerIds = new Set(originalProject.timers.map((t) => t.id));
  // 4. Update the project with new values
  const updateDate = new Date();
  const newProjectName = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const newProjectColor = typia.random<string>();
  const newProjectDescription = RandomGenerator.paragraph({ sentences: 2 });
  const newProjectBudget = typia.random<
    number & tags.Minimum<20> & tags.Maximum<500>
  >();
  const newStartDate = RandomGenerator.date(
    new Date(updateDate.getTime() + 86400000), // 1 day from update
    86400000 * 7,
  ).toISOString();
  const newEndDate = RandomGenerator.date(
    new Date(updateDate.getTime() + 86400000 * 7), // 7 days from update
    86400000 * 30,
  ).toISOString();
  const updatedProject =
    await api.functional.hrmPlatform.member.projects.update(memberConnection, {
      projectId: originalProject.id,
      body: {
        name: newProjectName,
        color_code: newProjectColor,
        description: newProjectDescription,
        budget_hours: newProjectBudget,
        start_date: newStartDate,
        end_date: newEndDate,
      } satisfies IHrmPlatformProject.IUpdate,
    });
  typia.assert(updatedProject);
  // 5. Validate project update
  TestValidator.equals(
    "project name updated",
    updatedProject.name,
    newProjectName,
  );
  TestValidator.equals(
    "color code updated",
    updatedProject.color_code,
    newProjectColor,
  );
  TestValidator.equals(
    "description updated",
    updatedProject.description,
    newProjectDescription,
  );
  TestValidator.equals(
    "budget hours updated",
    updatedProject.budget_hours,
    newProjectBudget,
  );
  TestValidator.equals(
    "start date updated",
    updatedProject.start_date,
    newStartDate,
  );
  TestValidator.equals("end date updated", updatedProject.end_date, newEndDate);
  // 6. Validate timestamp changed
  TestValidator.notEquals(
    "updated_at timestamp changed",
    originalUpdatedAt,
    updatedProject.updated_at,
  );
  TestValidator.equals(
    "created_at unchanged",
    originalCreatedAt,
    updatedProject.created_at,
  );
  // 7. Validate associated entities preserved (by ID)
  const updatedTaskIds = new Set(updatedProject.tasks.map((t) => t.id));
  for (const taskId of originalTaskIds) {
    TestValidator.predicate(
      `task ${taskId} still exists`,
      updatedTaskIds.has(taskId),
    );
  }
  const updatedTimelogIds = new Set(updatedProject.timelogs.map((t) => t.id));
  for (const timelogId of originalTimelogIds) {
    TestValidator.predicate(
      `timelog ${timelogId} still exists`,
      updatedTimelogIds.has(timelogId),
    );
  }
  const updatedTimerIds = new Set(updatedProject.timers.map((t) => t.id));
  for (const timerId of originalTimerIds) {
    TestValidator.predicate(
      `timer ${timerId} still exists`,
      updatedTimerIds.has(timerId),
    );
  }
}