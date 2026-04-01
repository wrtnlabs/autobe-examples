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
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_member_projects_tasks_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";

export async function test_api_task_history_date_range_filtering_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
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
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "America/New_York",
          fiscal_start_month: 1,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Create project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: "#3498db",
        status: "active",
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 4. Create task
  const task = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.name(),
        status: "open",
        priority: "medium",
      } satisfies IHrmPlatformTask.ICreate,
    },
  );
  typia.assert(task);
  // 5. Update task status multiple times to generate history entries
  const statusTransitions = [
    "in-progress",
    "completed",
    "in-progress",
    "closed",
  ] as const;
  for (const status of statusTransitions) {
    const updatedTask =
      await api.functional.hrmPlatform.member.projects.tasks.update(
        memberConnection,
        {
          projectId: project.id,
          taskId: task.id,
          body: { status } satisfies IHrmPlatformTask.IUpdate,
        },
      );
    typia.assert(updatedTask);
    // Small delay to ensure different timestamps
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  // 6. Retrieve all history entries to establish baseline
  const allHistory =
    await api.functional.hrmPlatform.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          sort: "created_at_desc",
          limit: 100,
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(allHistory);
  TestValidator.predicate("has history entries", allHistory.data.length >= 4);
  TestValidator.equals(
    "total records match",
    allHistory.pagination.records,
    allHistory.data.length,
  );
  // 7. Test created_at_from filter (get only recent changes)
  const sortedDesc = [...allHistory.data].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const midpointIndex = Math.floor(sortedDesc.length / 2);
  const midpointEntry = sortedDesc[midpointIndex];
  if (midpointEntry !== undefined) {
    const recentHistory =
      await api.functional.hrmPlatform.member.projects.tasks.histories.index(
        memberConnection,
        {
          projectId: project.id,
          taskId: task.id,
          body: {
            created_at_from: midpointEntry.created_at,
            sort: "created_at_desc",
            limit: 100,
          } satisfies IHrmPlatformTaskHistory.IRequest,
        },
      );
    typia.assert(recentHistory);
    TestValidator.predicate(
      "from filter returns recent entries",
      recentHistory.data.every(
        (h) => new Date(h.created_at) >= new Date(midpointEntry.created_at),
      ),
    );
  }
  // 8. Test created_at_to filter (get only older changes)
  if (midpointEntry !== undefined) {
    const olderHistory =
      await api.functional.hrmPlatform.member.projects.tasks.histories.index(
        memberConnection,
        {
          projectId: project.id,
          taskId: task.id,
          body: {
            created_at_to: midpointEntry.created_at,
            sort: "created_at_desc",
            limit: 100,
          } satisfies IHrmPlatformTaskHistory.IRequest,
        },
      );
    typia.assert(olderHistory);
    TestValidator.predicate(
      "to filter returns older entries",
      olderHistory.data.every(
        (h) => new Date(h.created_at) <= new Date(midpointEntry.created_at),
      ),
    );
  }
  // 9. Test combined date range filtering
  if (sortedDesc.length >= 3) {
    const oldestEntry = sortedDesc[sortedDesc.length - 1];
    const newestEntry = sortedDesc[0];
    if (oldestEntry !== undefined && newestEntry !== undefined) {
      const rangeHistory =
        await api.functional.hrmPlatform.member.projects.tasks.histories.index(
          memberConnection,
          {
            projectId: project.id,
            taskId: task.id,
            body: {
              created_at_from: oldestEntry.created_at,
              created_at_to: newestEntry.created_at,
              sort: "created_at_desc",
              limit: 100,
            } satisfies IHrmPlatformTaskHistory.IRequest,
          },
        );
      typia.assert(rangeHistory);
      TestValidator.predicate(
        "range filter returns entries within bounds",
        rangeHistory.data.every(
          (h) =>
            new Date(h.created_at) >= new Date(oldestEntry.created_at) &&
            new Date(h.created_at) <= new Date(newestEntry.created_at),
        ),
      );
    }
  }
  // 10. Test sorting - ascending order
  const ascHistory =
    await api.functional.hrmPlatform.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          sort: "created_at_asc",
          limit: 100,
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(ascHistory);
  for (let i = 1; i < ascHistory.data.length; i++) {
    const currentItem = ascHistory.data[i];
    const previousItem = ascHistory.data[i - 1];
    if (currentItem !== undefined && previousItem !== undefined) {
      TestValidator.predicate(
        "ascending sort order",
        new Date(currentItem.created_at) >= new Date(previousItem.created_at),
      );
    }
  }
  // 11. Test sorting - descending order
  const descHistory =
    await api.functional.hrmPlatform.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          sort: "created_at_desc",
          limit: 100,
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(descHistory);
  for (let i = 1; i < descHistory.data.length; i++) {
    const currentItem = descHistory.data[i];
    const previousItem = descHistory.data[i - 1];
    if (currentItem !== undefined && previousItem !== undefined) {
      TestValidator.predicate(
        "descending sort order",
        new Date(currentItem.created_at) <= new Date(previousItem.created_at),
      );
    }
  }
  // 12. Test pagination with small limit
  const pageSize = 2;
  const page1 =
    await api.functional.hrmPlatform.member.projects.tasks.histories.index(
      memberConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          sort: "created_at_desc",
          page: 1,
          limit: pageSize,
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, pageSize);
  TestValidator.predicate("page 1 has items", page1.data.length <= pageSize);
  // 13. Test pagination metadata
  const totalPages = Math.ceil(allHistory.pagination.records / pageSize);
  TestValidator.equals(
    "total pages calculated",
    page1.pagination.pages,
    totalPages,
  );
  TestValidator.equals(
    "total records consistent",
    page1.pagination.records,
    allHistory.pagination.records,
  );
  // 14. Navigate through all pages and collect entries
  const allPaginatedEntries: IHrmPlatformTaskHistory.ISummary[] = [];
  for (let pageNum = 1; pageNum <= page1.pagination.pages; pageNum++) {
    const page =
      await api.functional.hrmPlatform.member.projects.tasks.histories.index(
        memberConnection,
        {
          projectId: project.id,
          taskId: task.id,
          body: {
            sort: "created_at_desc",
            page: pageNum,
            limit: pageSize,
          } satisfies IHrmPlatformTaskHistory.IRequest,
        },
      );
    typia.assert(page);
    TestValidator.equals(
      "page number matches",
      page.pagination.current,
      pageNum,
    );
    allPaginatedEntries.push(...page.data);
  }
  // 15. Verify all entries are accessible without duplicates
  TestValidator.equals(
    "total paginated entries match",
    allPaginatedEntries.length,
    allHistory.pagination.records,
  );
  const uniqueIds = new Set(allPaginatedEntries.map((h) => h.id));
  TestValidator.equals(
    "no duplicate entries",
    uniqueIds.size,
    allPaginatedEntries.length,
  );
  // 16. Verify pagination preserves order
  for (let i = 1; i < allPaginatedEntries.length; i++) {
    const currentItem = allPaginatedEntries[i];
    const previousItem = allPaginatedEntries[i - 1];
    if (currentItem !== undefined && previousItem !== undefined) {
      TestValidator.predicate(
        "paginated entries maintain sort order",
        new Date(currentItem.created_at) <= new Date(previousItem.created_at),
      );
    }
  }
}
