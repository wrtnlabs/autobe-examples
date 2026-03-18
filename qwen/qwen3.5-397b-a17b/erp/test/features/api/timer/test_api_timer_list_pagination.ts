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
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimer";
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
import { generate_random_hrm_platform_member_timers_create } from "../../../generate/generate_random_hrm_platform_member_timers_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";
import { prepare_random_hrm_platform_timer } from "../../../prepare/prepare_random_hrm_platform_timer";

export async function test_api_timer_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(auth);
  // 2. Create 2 projects for timer association
  const project1 = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        color_code: "#FF5733",
      },
    },
  );
  typia.assert(project1);
  const project2 = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        color_code: "#33FF57",
      },
    },
  );
  typia.assert(project2);
  // 3. Create 1 task in first project
  const task1 = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project1.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        status: "open",
        priority: "medium",
      },
    },
  );
  typia.assert(task1);
  // 4. Create 3 timers: one with task, two without
  const timer1 = await generate_random_hrm_platform_member_timers_create(
    memberConnection,
    {
      body: {
        project_id: project1.id,
        task_id: task1.id,
        description: RandomGenerator.paragraph({ sentences: 1 }),
      },
    },
  );
  typia.assert(timer1);
  const timer2 = await generate_random_hrm_platform_member_timers_create(
    memberConnection,
    {
      body: {
        project_id: project2.id,
        description: RandomGenerator.paragraph({ sentences: 1 }),
      },
    },
  );
  typia.assert(timer2);
  const timer3 = await generate_random_hrm_platform_member_timers_create(
    memberConnection,
    {
      body: {
        project_id: project1.id,
        description: RandomGenerator.paragraph({ sentences: 1 }),
      },
    },
  );
  typia.assert(timer3);
  // Small delay to ensure different started_at timestamps for sorting validation
  await new Promise((resolve) => setTimeout(resolve, 10));
  // 5. Query timer list with default pagination
  const timerList = await api.functional.hrmPlatform.member.timers.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 20,
        sort: "started_at",
        direction: "desc",
      } satisfies IHrmPlatformTimer.IRequest,
    },
  );
  typia.assert(timerList);
  // 6. Validate pagination metadata
  TestValidator.equals("current page", timerList.pagination.current, 1);
  TestValidator.equals("limit", timerList.pagination.limit, 20);
  TestValidator.equals("records count", timerList.pagination.records, 3);
  TestValidator.equals("total pages", timerList.pagination.pages, 1);
  // 7. Validate timer list has 3 timers
  TestValidator.equals("timer count", timerList.data.length, 3);
  // 8. Validate all timers belong to created projects (data isolation)
  const projectIds = [project1.id, project2.id];
  const allTimersBelongToProjects = timerList.data.every((t) =>
    projectIds.includes(t.project.id),
  );
  TestValidator.predicate(
    "all timers belong to created projects",
    allTimersBelongToProjects,
  );
  // 9. Validate at least one timer has task and others don't
  const timersWithTask = timerList.data.filter((t) => t.task !== null);
  const timersWithoutTask = timerList.data.filter((t) => t.task === null);
  TestValidator.predicate("has timer with task", timersWithTask.length >= 1);
  TestValidator.predicate(
    "has timers without task",
    timersWithoutTask.length >= 1,
  );
  // 10. Validate sorting by started_at descending
  const startedAts = timerList.data.map((t) =>
    new Date(t.started_at).getTime(),
  );
  const sortedDesc = [...startedAts].sort((a, b) => b - a);
  TestValidator.equals(
    "timers sorted by started_at descending",
    startedAts,
    sortedDesc,
  );
  // 11. Validate timer with task has correct task association
  const timerWithTask = timerList.data.find((t) => t.task !== null);
  if (timerWithTask && timerWithTask.task) {
    TestValidator.equals(
      "timer with task has correct task id",
      timerWithTask.task.id,
      task1.id,
    );
  }
}
