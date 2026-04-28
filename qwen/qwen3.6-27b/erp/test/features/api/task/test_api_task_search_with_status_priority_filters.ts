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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTask";
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
 * Test task search with status and priority filters via PATCH /hrmPlatform/member/tasks.
 *
 * Validates that task filtering works correctly when status and priority filter criteria are applied. Creates multiple tasks with various statuses (open, in-progress, completed) and priorities (high, medium, low), then verifies that the PATCH search endpoint correctly returns only tasks matching the specified filter combination.
 *
 * Special attention is given to verifying AND logic for multiple filters (status AND priority must both match), correct pagination metadata when filtering reduces the result set, empty results when no tasks match the criteria, and that each returned task contains complete data including project summary, assigned employee summary, and parent task summary.
 *
 * 1. Authenticate member via join.
 * 2. Create a project.
 * 3. Create 3 tasks with status='open' and priority='high'.
 * 4. Create 2 tasks with status='in-progress' and priority='medium'.
 * 5. Create 1 task with status='completed' and priority='low'.
 * 6. PATCH with status='open' AND priority='high' returns exactly 3 tasks.
 * 7. PATCH with status='in-progress' returns exactly 2 tasks.
 * 8. PATCH with status='closed' returns 0 tasks (empty results).
 */
export async function test_api_task_search_with_status_priority_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Create tasks with status='open' and priority='high'
  const openHighTasks = await ArrayUtil.asyncRepeat(3, async () => {
    const task =
      await generate_random_hrm_platform_member_projects_tasks_create(
        memberConnection,
        {
          params: { projectId: project.id },
          body: { status: "open", priority: "high" },
        },
      );
    return task;
  });
  for (const task of openHighTasks) {
    typia.assert(task);
  }
  // 4. Create tasks with status='in-progress' and priority='medium'
  const inProgressMediumTasks = await ArrayUtil.asyncRepeat(2, async () => {
    const task =
      await generate_random_hrm_platform_member_projects_tasks_create(
        memberConnection,
        {
          params: { projectId: project.id },
          body: { status: "in-progress", priority: "medium" },
        },
      );
    return task;
  });
  for (const task of inProgressMediumTasks) {
    typia.assert(task);
  }
  // 5. Create task with status='completed' and priority='low'
  const completedLowTask =
    await generate_random_hrm_platform_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: { status: "completed", priority: "low" },
      },
    );
  typia.assert(completedLowTask);
  // 6. PATCH with status='open' AND priority='high' — should return exactly 3
  const openHighResult = await api.functional.hrmPlatform.member.tasks.index(
    memberConnection,
    {
      body: {
        status: "open",
        priority: "high",
      } satisfies IHrmPlatformTask.IRequest,
    },
  );
  typia.assert(openHighResult);
  TestValidator.equals(
    "open + high filter count",
    openHighResult.pagination.records,
    3,
  );
  TestValidator.equals(
    "open + high data count matches records",
    openHighResult.data.length,
    3,
  );
  TestValidator.equals(
    "open + high pagination current",
    openHighResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "open + high pagination limit is positive",
    openHighResult.pagination.limit > 0,
  );
  TestValidator.equals(
    "open + high pagination pages",
    openHighResult.pagination.pages,
    1,
  );
  // Verify each returned task matches filter criteria
  for (const task of openHighResult.data) {
    typia.assert(task);
    TestValidator.equals(`task status is open`, task.status, "open");
    TestValidator.equals(`task priority is high`, task.priority, "high");
    TestValidator.predicate(
      `task has project summary`,
      task.project.id !== undefined,
    );
    TestValidator.predicate(`task has id`, task.id !== undefined);
    TestValidator.predicate(`task has title`, task.title !== undefined);
  }
  // 7. PATCH with status='in-progress' — should return exactly 2
  const inProgressResult = await api.functional.hrmPlatform.member.tasks.index(
    memberConnection,
    {
      body: {
        status: "in-progress",
      } satisfies IHrmPlatformTask.IRequest,
    },
  );
  typia.assert(inProgressResult);
  TestValidator.equals(
    "in-progress filter count",
    inProgressResult.pagination.records,
    2,
  );
  TestValidator.equals(
    "in-progress data count matches records",
    inProgressResult.data.length,
    2,
  );
  for (const task of inProgressResult.data) {
    typia.assert(task);
    TestValidator.equals(
      `task status is in-progress`,
      task.status,
      "in-progress",
    );
  }
  // 8. PATCH with status='closed' — should return 0 tasks (empty results)
  const closedResult = await api.functional.hrmPlatform.member.tasks.index(
    memberConnection,
    {
      body: {
        status: "closed",
      } satisfies IHrmPlatformTask.IRequest,
    },
  );
  typia.assert(closedResult);
  TestValidator.equals(
    "closed filter returns zero records",
    closedResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "closed filter data is empty",
    closedResult.data.length,
    0,
  );
  TestValidator.equals(
    "closed filter pagination pages is zero",
    closedResult.pagination.pages,
    0,
  );
  // 9. Verify AND logic: status='open' AND priority='medium' — should return 0
  // (all open tasks are priority='high', all medium tasks are in-progress)
  const andLogicResult = await api.functional.hrmPlatform.member.tasks.index(
    memberConnection,
    {
      body: {
        status: "open",
        priority: "medium",
      } satisfies IHrmPlatformTask.IRequest,
    },
  );
  typia.assert(andLogicResult);
  TestValidator.equals(
    "AND logic: open + medium returns zero records",
    andLogicResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "AND logic: open + medium data is empty",
    andLogicResult.data.length,
    0,
  );
}
