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
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
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

/**
 * Test timer list filtering by stopped status to distinguish between running and stopped timers.
 *
 * This test validates the stopped filter parameter on the timer list endpoint:
 * 1. Authenticate as a member and create a project with a task
 * 2. Create first timer session and leave it running (stopped_at is null)
 * 3. Create second timer session and stop it (stopped_at has timestamp)
 * 4. Query with stopped=false to retrieve only running timers
 * 5. Query with stopped=true to retrieve only stopped timers
 * 6. Query with stopped=null to retrieve all timers
 * 7. Validate filter correctness and combine with project_id filter
 */
export async function test_api_timer_list_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: `${RandomGenerator.alphabets(10)}@test.com`,
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authResult);
  // 2. Create a project for timer association
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#3498db",
      },
    },
  );
  typia.assert(project);
  // 3. Create a task within the project
  const task = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        status: "open",
        priority: "medium",
      },
    },
  );
  typia.assert(task);
  // 4. Create first timer session (leave it running - stopped_at will be null)
  const runningTimer = await generate_random_hrm_platform_member_timers_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        task_id: task.id,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(runningTimer);
  TestValidator.predicate(
    "running timer has null stopped_at",
    runningTimer.stopped_at === null,
  );
  // 5. Create second timer session and stop it
  const timerToStop = await generate_random_hrm_platform_member_timers_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        task_id: null,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(timerToStop);
  // Stop the second timer to create a stopped record with timelog
  const timelog = await api.functional.hrmPlatform.member.timers.stop(
    memberConnection,
    {
      timerId: timerToStop.id,
    },
  );
  typia.assert(timelog);
  // 6. Query with stopped=false to retrieve only running timers
  const runningTimersResult =
    await api.functional.hrmPlatform.member.timers.index(memberConnection, {
      body: {
        stopped: false,
      } satisfies IHrmPlatformTimer.IRequest,
    });
  typia.assert(runningTimersResult);
  TestValidator.predicate(
    "stopped=false returns at least one timer",
    runningTimersResult.data.length >= 1,
  );
  TestValidator.predicate(
    "all returned timers are running (stopped_at is null)",
    runningTimersResult.data.every((timer) => timer.stopped_at === null),
  );
  TestValidator.predicate(
    "running timer is in the result",
    runningTimersResult.data.some((timer) => timer.id === runningTimer.id),
  );
  // 7. Query with stopped=true to retrieve only stopped timers
  const stoppedTimersResult =
    await api.functional.hrmPlatform.member.timers.index(memberConnection, {
      body: {
        stopped: true,
      } satisfies IHrmPlatformTimer.IRequest,
    });
  typia.assert(stoppedTimersResult);
  TestValidator.predicate(
    "stopped=true returns at least one timer",
    stoppedTimersResult.data.length >= 1,
  );
  TestValidator.predicate(
    "all returned timers are stopped (stopped_at is not null)",
    stoppedTimersResult.data.every((timer) => timer.stopped_at !== null),
  );
  TestValidator.predicate(
    "stopped timer is in the result",
    stoppedTimersResult.data.some((timer) => timer.id === timerToStop.id),
  );
  // 8. Query with stopped=null to retrieve all timers
  const allTimersResult = await api.functional.hrmPlatform.member.timers.index(
    memberConnection,
    {
      body: {
        stopped: null,
      } satisfies IHrmPlatformTimer.IRequest,
    },
  );
  typia.assert(allTimersResult);
  TestValidator.predicate(
    "stopped=null returns all timers",
    allTimersResult.data.length >=
      runningTimersResult.data.length + stoppedTimersResult.data.length,
  );
  // 9. Query without stopped parameter (should return all timers)
  const allTimersNoFilterResult =
    await api.functional.hrmPlatform.member.timers.index(memberConnection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies IHrmPlatformTimer.IRequest,
    });
  typia.assert(allTimersNoFilterResult);
  TestValidator.predicate(
    "no stopped filter returns all timers",
    allTimersNoFilterResult.data.length >= 2,
  );
  // 10. Test combination of stopped filter with project_id filter
  const runningTimersWithProjectFilter =
    await api.functional.hrmPlatform.member.timers.index(memberConnection, {
      body: {
        stopped: false,
        project_id: project.id,
      } satisfies IHrmPlatformTimer.IRequest,
    });
  typia.assert(runningTimersWithProjectFilter);
  TestValidator.predicate(
    "stopped=false with project_id returns running timers for project",
    runningTimersWithProjectFilter.data.every(
      (timer) => timer.stopped_at === null && timer.project.id === project.id,
    ),
  );
  const stoppedTimersWithProjectFilter =
    await api.functional.hrmPlatform.member.timers.index(memberConnection, {
      body: {
        stopped: true,
        project_id: project.id,
      } satisfies IHrmPlatformTimer.IRequest,
    });
  typia.assert(stoppedTimersWithProjectFilter);
  TestValidator.predicate(
    "stopped=true with project_id returns stopped timers for project",
    stoppedTimersWithProjectFilter.data.every(
      (timer) => timer.stopped_at !== null && timer.project.id === project.id,
    ),
  );
  // 11. Validate stopped timer has actual timestamp in stopped_at
  const stoppedTimerDetails = stoppedTimersResult.data.find(
    (t) => t.id === timerToStop.id,
  );
  if (stoppedTimerDetails) {
    TestValidator.predicate(
      "stopped timer has valid stopped_at timestamp",
      stoppedTimerDetails.stopped_at !== null,
    );
  }
  // 12. Validate running timer has null stopped_at
  const runningTimerDetails = runningTimersResult.data.find(
    (t) => t.id === runningTimer.id,
  );
  if (runningTimerDetails) {
    TestValidator.predicate(
      "running timer has null stopped_at",
      runningTimerDetails.stopped_at === null,
    );
  }
}
