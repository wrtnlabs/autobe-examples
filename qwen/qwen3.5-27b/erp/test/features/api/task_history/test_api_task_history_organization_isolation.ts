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
import type { IHrmPlatformTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTaskHistory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTaskHistory";
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
 * Test organization-based access control and permission isolation for task history.
 * Validates that members can only view task history for tasks within their own organization,
 * ensuring proper multi-tenancy isolation and permission enforcement.
 */
export async function test_api_task_history_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup Member A (first organization)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberA);
  // 2. Create Project A for Member A
  const projectA = await generate_random_hrm_platform_member_projects_create(
    memberAConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        status: "active",
        color_code: "#FF5733",
      },
    },
  );
  typia.assert(projectA);
  // 3. Create Task A in Project A
  const taskA = await generate_random_hrm_platform_member_projects_tasks_create(
    memberAConnection,
    {
      params: { projectId: projectA.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        status: "open",
        priority: "medium",
      },
    },
  );
  typia.assert(taskA);
  // 4. Update Task A status to create history entry
  await api.functional.hrmPlatform.member.tasks.update(memberAConnection, {
    taskId: taskA.id,
    body: {
      status: "in-progress",
    } satisfies IHrmPlatformTask.IUpdate,
  });
  // 5. Setup Member B (second organization - different from Member A)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberB);
  // 6. Create Project B for Member B
  const projectB = await generate_random_hrm_platform_member_projects_create(
    memberBConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        status: "active",
        color_code: "#33FF57",
      },
    },
  );
  typia.assert(projectB);
  // 7. Create Task B in Project B
  const taskB = await generate_random_hrm_platform_member_projects_tasks_create(
    memberBConnection,
    {
      params: { projectId: projectB.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        status: "open",
        priority: "high",
      },
    },
  );
  typia.assert(taskB);
  // 8. Update Task B status to create history entry
  await api.functional.hrmPlatform.member.tasks.update(memberBConnection, {
    taskId: taskB.id,
    body: {
      status: "completed",
    } satisfies IHrmPlatformTask.IUpdate,
  });
  // 9. Test Isolation: Member A queries task history for Task A (should succeed)
  const memberATaskHistory =
    await api.functional.hrmPlatform.member.task_histories.index(
      memberAConnection,
      {
        body: {
          taskId: taskA.id,
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(memberATaskHistory);
  // Validate Member A can see their own task history
  TestValidator.predicate(
    "Member A can see their own task history",
    memberATaskHistory.data.length > 0,
  );
  TestValidator.equals(
    "Member A history contains correct task",
    memberATaskHistory.data[0].task.id,
    taskA.id,
  );
  // 10. Test Isolation: Member A queries task history for Task B (should return empty)
  const memberACrossOrgHistory =
    await api.functional.hrmPlatform.member.task_histories.index(
      memberAConnection,
      {
        body: {
          taskId: taskB.id,
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(memberACrossOrgHistory);
  // Validate Member A cannot see Member B's task history (cross-organization isolation)
  TestValidator.equals(
    "Member A cannot see cross-organization task history",
    memberACrossOrgHistory.data.length,
    0,
  );
  // 11. Test Isolation: Member B queries task history for Task B (should succeed)
  const memberBTaskHistory =
    await api.functional.hrmPlatform.member.task_histories.index(
      memberBConnection,
      {
        body: {
          taskId: taskB.id,
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(memberBTaskHistory);
  // Validate Member B can see their own task history
  TestValidator.predicate(
    "Member B can see their own task history",
    memberBTaskHistory.data.length > 0,
  );
  TestValidator.equals(
    "Member B history contains correct task",
    memberBTaskHistory.data[0].task.id,
    taskB.id,
  );
  // 12. Test Isolation: Member B queries task history for Task A (should return empty)
  const memberBCrossOrgHistory =
    await api.functional.hrmPlatform.member.task_histories.index(
      memberBConnection,
      {
        body: {
          taskId: taskA.id,
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(memberBCrossOrgHistory);
  // Validate Member B cannot see Member A's task history (cross-organization isolation)
  TestValidator.equals(
    "Member B cannot see cross-organization task history",
    memberBCrossOrgHistory.data.length,
    0,
  );
  // 13. Additional validation: Verify task history entries contain correct data
  TestValidator.equals(
    "Member A task history has correct status transition",
    memberATaskHistory.data[0].old_status,
    "open",
  );
  TestValidator.equals(
    "Member A task history new status is correct",
    memberATaskHistory.data[0].new_status,
    "in-progress",
  );
  TestValidator.equals(
    "Member B task history has correct status transition",
    memberBTaskHistory.data[0].old_status,
    "open",
  );
  TestValidator.equals(
    "Member B task history new status is correct",
    memberBTaskHistory.data[0].new_status,
    "completed",
  );
  // 14. Verify member information in task history
  TestValidator.equals(
    "Member A task history shows correct member",
    memberATaskHistory.data[0].member.id,
    memberA.id,
  );
  TestValidator.equals(
    "Member B task history shows correct member",
    memberBTaskHistory.data[0].member.id,
    memberB.id,
  );
}
