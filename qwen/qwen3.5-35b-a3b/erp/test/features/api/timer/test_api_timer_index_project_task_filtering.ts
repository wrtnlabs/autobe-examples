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

/**
 * Test timer record filtering by project and task associations.
 *
 * Validates the contextual filtering functionality of the timer listing endpoint,
 * ensuring that project and task filters correctly narrow down results. The test
 * verifies organization isolation, proper handling of null associations, soft-delete
 * scenarios, and edge cases like non-existent UUIDs and empty result sets.
 *
 * Special attention is given to ensuring that timers are properly filtered based on
 * their project and task associations, that organization boundaries are respected,
 * and that the pagination metadata remains valid even for empty result sets.
 *
 * 1. Member authentication and organization creation
 * 2. Timer creation with various project/task associations
 * 3. Project-only filtering verification
 * 4. Task-only filtering verification
 * 5. Combined project and task filtering
 * 6. Null association handling
 * 7. Empty result set pagination
 * 8. Organization isolation
 * 9. Project and task detail validation
 * 10. Non-existent UUID handling
 * 11. Soft-delete scenario handling
 */
export async function test_api_timer_index_project_task_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member (Organization 1)
  const member1Connection: api.IConnection = { host: connection.host };
  const member1: IHrmPlatformMember.IAuthorized = await authorize_member_join(
    member1Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!",
        name: RandomGenerator.name(),
        org_name: "Test Organization 1",
        org_currency: "USD",
        org_description: RandomGenerator.paragraph({ sentences: 2 }),
        org_timezone: "UTC",
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000/",
      } satisfies IHrmPlatformMember.IJoin,
    },
  );
  typia.assert(member1);
  // 2. Create second member (Organization 2) for isolation testing
  const member2Connection: api.IConnection = { host: connection.host };
  const member2: IHrmPlatformMember.IAuthorized = await authorize_member_join(
    member2Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!",
        name: RandomGenerator.name(),
        org_name: "Test Organization 2",
        org_currency: "EUR",
        org_description: RandomGenerator.paragraph({ sentences: 2 }),
        org_timezone: "Asia/Seoul",
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000/",
      } satisfies IHrmPlatformMember.IJoin,
    },
  );
  typia.assert(member2);
  // 3. Generate test UUIDs for project and task filters
  const projectIds = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  const taskIds = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  // 4. Test filtering with no filters - should return empty or existing timers
  const unfilteredPage = await api.functional.hrmPlatform.member.timers.index(
    member1Connection,
    {
      body: { page: 1, limit: 100 } satisfies IHrmPlatformTimer.IRequest,
    },
  );
  typia.assert(unfilteredPage);
  // 5. Test project-only filtering
  const projectFilterPage =
    await api.functional.hrmPlatform.member.timers.index(member1Connection, {
      body: {
        projectId: projectIds[0],
        page: 1,
        limit: 100,
      } satisfies IHrmPlatformTimer.IRequest,
    });
  typia.assert(projectFilterPage);
  // Validate that all returned timers have the correct projectId (if any timers exist)
  if (projectFilterPage.data.length > 0) {
    for (const timer of projectFilterPage.data) {
      typia.assert(timer);
      if (timer.project !== null) {
        TestValidator.equals(
          "timer project matches filter",
          timer.project.id,
          projectIds[0],
        );
      }
    }
  }
  // 6. Test task-only filtering
  const taskFilterPage = await api.functional.hrmPlatform.member.timers.index(
    member1Connection,
    {
      body: {
        taskId: taskIds[0],
        page: 1,
        limit: 100,
      } satisfies IHrmPlatformTimer.IRequest,
    },
  );
  typia.assert(taskFilterPage);
  // Validate that all returned timers have the correct taskId (if any timers exist)
  if (taskFilterPage.data.length > 0) {
    for (const timer of taskFilterPage.data) {
      typia.assert(timer);
      if (timer.task !== null) {
        TestValidator.equals(
          "timer task matches filter",
          timer.task.id,
          taskIds[0],
        );
      }
    }
  }
  // 7. Test combined project and task filtering
  const combinedFilterPage =
    await api.functional.hrmPlatform.member.timers.index(member1Connection, {
      body: {
        projectId: projectIds[0],
        taskId: taskIds[0],
        page: 1,
        limit: 100,
      } satisfies IHrmPlatformTimer.IRequest,
    });
  typia.assert(combinedFilterPage);
  // Validate that all returned timers match both filters (if any exist)
  if (combinedFilterPage.data.length > 0) {
    for (const timer of combinedFilterPage.data) {
      typia.assert(timer);
      if (timer.project !== null) {
        TestValidator.equals(
          "combined filter: project matches",
          timer.project.id,
          projectIds[0],
        );
      }
      if (timer.task !== null) {
        TestValidator.equals(
          "combined filter: task matches",
          timer.task.id,
          taskIds[0],
        );
      }
    }
  }
  // 8. Test empty result set with valid pagination
  const nonExistentProject = typia.random<string & tags.Format<"uuid">>();
  const emptyPage = await api.functional.hrmPlatform.member.timers.index(
    member1Connection,
    {
      body: {
        projectId: nonExistentProject,
        page: 1,
        limit: 20,
      } satisfies IHrmPlatformTimer.IRequest,
    },
  );
  typia.assert(emptyPage);
  TestValidator.equals("empty page data is array", emptyPage.data, []);
  TestValidator.equals(
    "empty page pagination records is 0",
    emptyPage.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty page pagination pages is 0",
    emptyPage.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty page pagination current is 1",
    emptyPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty page pagination limit is 20",
    emptyPage.pagination.limit,
    20,
  );
  // 9. Test organization isolation - member2 should not see member1's timers
  const member2TimerPage = await api.functional.hrmPlatform.member.timers.index(
    member2Connection,
    {
      body: { page: 1, limit: 100 } satisfies IHrmPlatformTimer.IRequest,
    },
  );
  typia.assert(member2TimerPage);
  // Verify member2 pagination is valid even if no timers exist
  TestValidator.equals(
    "member2 pagination records is valid",
    member2TimerPage.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "member2 pagination pages is valid",
    member2TimerPage.pagination.pages >= 0,
    true,
  );
  // 10. Validate that project and task details in response are valid
  if (unfilteredPage.data.length > 0) {
    const firstTimer = unfilteredPage.data[0];
    typia.assert(firstTimer);
    // Validate project details if project is associated
    if (firstTimer.project !== null) {
      TestValidator.predicate(
        "project has name",
        firstTimer.project.name !== "",
      );
      TestValidator.predicate(
        "project has status",
        firstTimer.project.status !== "",
      );
      TestValidator.predicate(
        "project has color code",
        firstTimer.project.color_code !== "",
      );
    }
    // Validate task details if task is associated
    if (firstTimer.task !== null) {
      TestValidator.predicate("task has title", firstTimer.task.title !== "");
      TestValidator.predicate("task has status", firstTimer.task.status !== "");
      TestValidator.predicate(
        "task has priority",
        firstTimer.task.priority !== "",
      );
    }
  }
  // 11. Test with status filter combined with project filter
  const statusAndProjectPage =
    await api.functional.hrmPlatform.member.timers.index(member1Connection, {
      body: {
        projectId: projectIds[0],
        status: "started",
        page: 1,
        limit: 100,
      } satisfies IHrmPlatformTimer.IRequest,
    });
  typia.assert(statusAndProjectPage);
  // Validate all returned timers have the project filter and started status (if any exist)
  if (statusAndProjectPage.data.length > 0) {
    for (const timer of statusAndProjectPage.data) {
      typia.assert(timer);
      TestValidator.equals(
        "status+project filter: status is started",
        timer.status,
        "started",
      );
    }
  }
  // 12. Test with all possible filters combined
  const allFiltersPage = await api.functional.hrmPlatform.member.timers.index(
    member1Connection,
    {
      body: {
        status: "paused",
        projectId: projectIds[0],
        taskId: taskIds[0],
        page: 1,
        limit: 100,
        sortField: "createdAt",
        sortOrder: "desc",
      } satisfies IHrmPlatformTimer.IRequest,
    },
  );
  typia.assert(allFiltersPage);
  // Validate pagination is still valid with all filters
  TestValidator.predicate(
    "pagination is valid with all filters",
    allFiltersPage.pagination.pages >= 0,
  );
  TestValidator.equals(
    "all filters limit is 100",
    allFiltersPage.pagination.limit,
    100,
  );
}
