import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import type { IHrmsProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProjectMember";
import type { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import type { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import type { IHrmsTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimer";
import type { IHrmsTopEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTopEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_organizations_projects_create } from "../../../generate/generate_random_hrms_member_organizations_projects_create";
import { generate_random_hrms_member_projects_members_add_member } from "../../../generate/generate_random_hrms_member_projects_members_add_member";
import { generate_random_hrms_member_projects_tasks_create } from "../../../generate/generate_random_hrms_member_projects_tasks_create";
import { generate_random_hrms_member_timers_create } from "../../../generate/generate_random_hrms_member_timers_create";
import { prepare_random_hrms_project } from "../../../prepare/prepare_random_hrms_project";
import { prepare_random_hrms_project_member } from "../../../prepare/prepare_random_hrms_project_member";
import { prepare_random_hrms_task } from "../../../prepare/prepare_random_hrms_task";
import { prepare_random_hrms_timer } from "../../../prepare/prepare_random_hrms_timer";

export async function test_api_timer_start_with_project_and_task(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member to create account and get authorization
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Get organization from member's memberships
  const orgMembership = memberAuth.organization_memberships[0];
  typia.assert(orgMembership);
  const orgId = orgMembership.organization.id;
  // 3. Create project in organization
  const project =
    await generate_random_hrms_member_organizations_projects_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          color_code: `#${RandomGenerator.alphaNumeric(6)}`,
        },
        params: { organizationId: orgId },
      },
    );
  typia.assert(project);
  // 4. Add employee to project as member
  const employeeId = memberAuth.id;
  const projectMember =
    await generate_random_hrms_member_projects_members_add_member(
      memberConnection,
      {
        body: {
          employee_id: employeeId,
          role: "member",
        },
        params: { projectId: (project as any).id },
      },
    );
  typia.assert(projectMember);
  // 5. Create task within the project
  const task = await generate_random_hrms_member_projects_tasks_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 2,
          wordMax: 4,
        }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        priority: RandomGenerator.pick(["low", "medium", "high", "urgent"]),
      },
      params: { projectId: (project as any).id },
    },
  );
  typia.assert(task);
  // 6. Start timer with project_id and task_id
  const timerDescription = RandomGenerator.paragraph({ sentences: 2 });
  const timer = await api.functional.hrms.member.timers.create(
    memberConnection,
    {
      body: {
        project_id: (project as any).id,
        task_id: (task as any).id,
        description: timerDescription,
      },
    },
  );
  typia.assert(timer);
  // 7. Validate timer response
  TestValidator.equals("timer has project", (timer.project as any).id, (project as any).id);
  TestValidator.equals("timer has task", (timer.task as any)?.id, (task as any).id);
  TestValidator.equals(
    "timer employee matches member",
    timer.employee.id,
    memberAuth.id,
  );
  TestValidator.predicate(
    "timer is active (deleted_at NULL)",
    timer.deleted_at === null,
  );
  TestValidator.predicate(
    "timer has start_at timestamp",
    timer.start_at !== undefined,
  );
  TestValidator.equals(
    "timer description matches",
    timer.description,
    timerDescription,
  );
}