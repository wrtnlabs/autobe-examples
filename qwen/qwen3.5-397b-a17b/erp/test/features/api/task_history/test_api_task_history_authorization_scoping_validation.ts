import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTaskHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_members_create } from "../../../generate/generate_random_hrm_platform_member_projects_members_create";
import { generate_random_hrm_platform_member_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_member_projects_tasks_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";

export async function test_api_task_history_authorization_scoping_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          currency: "USD",
          timezone: "America/New_York",
          fiscal_start_month: 1,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Create Project A (where task will be created)
  const projectA = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: "Project A - Task History Test",
        color_code: "#FF5733",
        status: "active",
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(projectA);
  // 4. Create Project B (for scoping validation - mismatched project)
  const projectB = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: "Project B - Scoping Validation",
        color_code: "#33FF57",
        status: "active",
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(projectB);
  // 5. Assign member to Project A as project-lead
  // Note: Using member ID as employee ID - in production, employee ID would be retrieved from employee endpoint
  const projectMemberA =
    await generate_random_hrm_platform_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: projectA.id },
        body: {
          hrm_platform_employee_id: memberAuth.id,
          role: "project-lead",
        } satisfies IHrmPlatformProjectMember.ICreate,
      },
    );
  typia.assert(projectMemberA);
  // 6. Assign member to Project B as project-lead
  const projectMemberB =
    await generate_random_hrm_platform_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: projectB.id },
        body: {
          hrm_platform_employee_id: memberAuth.id,
          role: "project-lead",
        } satisfies IHrmPlatformProjectMember.ICreate,
      },
    );
  typia.assert(projectMemberB);
  // 7. Create task in Project A
  const taskInProjectA =
    await generate_random_hrm_platform_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: projectA.id },
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          status: "open",
          priority: "medium",
          description: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies IHrmPlatformTask.ICreate,
      },
    );
  typia.assert(taskInProjectA);
  // 8. Test authorization scoping validation
  // Attempt to retrieve task history using mismatched project ID (Project B instead of Project A)
  // This validates that the system enforces proper scoping: projectId/taskId/historyId must all match
  const randomHistoryId = typia.random<string & tags.Format<"uuid">>();
  // Test with mismatched projectId (Project B's ID with Project A's task ID)
  // Should fail because the taskId belongs to Project A, not Project B
  await TestValidator.error(
    "mismatched project scope should be rejected",
    async () => {
      await api.functional.hrmPlatform.member.projects.tasks.histories.at(
        memberConnection,
        {
          projectId: projectB.id,
          taskId: taskInProjectA.id,
          historyId: randomHistoryId,
        },
      );
    },
  );
  // Test with correct projectId but non-existent historyId
  // Should fail because the history entry does not exist
  await TestValidator.error(
    "non-existent history entry should be rejected",
    async () => {
      await api.functional.hrmPlatform.member.projects.tasks.histories.at(
        memberConnection,
        {
          projectId: projectA.id,
          taskId: taskInProjectA.id,
          historyId: randomHistoryId,
        },
      );
    },
  );
  // Test with mismatched taskId (task from different project context)
  // Create another task in Project B for cross-project validation
  const taskInProjectB =
    await generate_random_hrm_platform_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: projectB.id },
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          status: "open",
          priority: "high",
        } satisfies IHrmPlatformTask.ICreate,
      },
    );
  typia.assert(taskInProjectB);
  // Test cross-project access: Project A's ID with Project B's task ID
  await TestValidator.error(
    "cross-project task access should be rejected",
    async () => {
      await api.functional.hrmPlatform.member.projects.tasks.histories.at(
        memberConnection,
        {
          projectId: projectA.id,
          taskId: taskInProjectB.id,
          historyId: randomHistoryId,
        },
      );
    },
  );
}
