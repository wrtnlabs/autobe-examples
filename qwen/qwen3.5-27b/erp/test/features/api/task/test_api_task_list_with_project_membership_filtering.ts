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
import type { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
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
import { generate_random_hrm_platform_member_projects_memberships_create } from "../../../generate/generate_random_hrm_platform_member_projects_memberships_create";
import { generate_random_hrm_platform_member_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_member_projects_tasks_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_membership } from "../../../prepare/prepare_random_hrm_platform_project_membership";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";

export async function test_api_task_list_with_project_membership_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create a project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        status: "active",
        color_code: `#${RandomGenerator.alphaNumeric(6)}`,
      },
    },
  );
  typia.assert(project);
  // 3. Create tasks in the project (multiple tasks with different statuses and priorities)
  const tasks = await ArrayUtil.asyncRepeat(5, async (index) => {
    const task =
      await generate_random_hrm_platform_member_projects_tasks_create(
        memberConnection,
        {
          params: { projectId: project.id },
          body: {
            title: `${RandomGenerator.paragraph({ sentences: 2 })} - Task ${index + 1}`,
            status: RandomGenerator.pick([
              "open",
              "in-progress",
              "completed",
              "closed",
            ] as const),
            priority: RandomGenerator.pick([
              "low",
              "medium",
              "high",
              "urgent",
            ] as const),
            due_date:
              index % 2 === 0
                ? new Date(Date.now() + (index + 1) * 86400000).toISOString()
                : null,
            estimated_hours: index % 3 === 0 ? null : Math.random() * 40 + 1,
          },
        },
      );
    typia.assert(task);
    return task;
  });
  // 4. Test task listing - should return all tasks from the project
  const allTasksResponse = await api.functional.hrmPlatform.member.tasks.index(
    memberConnection,
    {
      body: {
        page: 1,
        page_size: 100,
      },
    },
  );
  typia.assert(allTasksResponse);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    allTasksResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    allTasksResponse.pagination.limit,
    100,
  );
  TestValidator.equals("total records", allTasksResponse.pagination.records, 5);
  TestValidator.equals("total pages", allTasksResponse.pagination.pages, 1);
  // Validate task count
  TestValidator.equals("task count", allTasksResponse.data.length, 5);
  // Validate each task has required fields
  for (const task of allTasksResponse.data) {
    TestValidator.predicate("task has id", task.id !== undefined);
    TestValidator.predicate("task has title", task.title !== undefined);
    TestValidator.predicate("task has status", task.status !== undefined);
    TestValidator.predicate("task has priority", task.priority !== undefined);
    TestValidator.predicate("task has project", task.project !== undefined);
    TestValidator.equals(
      "task belongs to created project",
      task.project.id,
      project.id,
    );
  }
  // 5. Test filtering by status
  const firstTaskStatus = typia.assert<
    "open" | "in-progress" | "completed" | "closed"
  >(tasks[0].status!);
  const statusFilteredResponse =
    await api.functional.hrmPlatform.member.tasks.index(memberConnection, {
      body: {
        status: firstTaskStatus,
        page: 1,
        page_size: 100,
      },
    });
  typia.assert(statusFilteredResponse);
  TestValidator.predicate(
    "status filter applied",
    statusFilteredResponse.pagination.records >= 1,
  );
  for (const task of statusFilteredResponse.data) {
    TestValidator.equals(
      "filtered task status matches",
      task.status,
      firstTaskStatus,
    );
  }
  // 6. Test filtering by priority
  const firstTaskPriority = typia.assert<
    "low" | "medium" | "high" | "urgent"
  >(tasks[0].priority!);
  const priorityFilteredResponse =
    await api.functional.hrmPlatform.member.tasks.index(memberConnection, {
      body: {
        priority: firstTaskPriority,
        page: 1,
        page_size: 100,
      },
    });
  typia.assert(priorityFilteredResponse);
  TestValidator.predicate(
    "priority filter applied",
    priorityFilteredResponse.pagination.records >= 1,
  );
  for (const task of priorityFilteredResponse.data) {
    TestValidator.equals(
      "filtered task priority matches",
      task.priority,
      firstTaskPriority,
    );
  }
  // 7. Test search by title
  const searchKeyword = tasks[0].title.substring(0, 10);
  const searchResponse = await api.functional.hrmPlatform.member.tasks.index(
    memberConnection,
    {
      body: {
        search: searchKeyword,
        page: 1,
        page_size: 100,
      },
    },
  );
  typia.assert(searchResponse);
  TestValidator.predicate(
    "search returns results",
    searchResponse.pagination.records >= 1,
  );
  for (const task of searchResponse.data) {
    TestValidator.predicate(
      "search result contains keyword",
      task.title.includes(searchKeyword),
    );
  }
  // 8. Test sorting by created_at descending
  const sortByCreatedAtResponse =
    await api.functional.hrmPlatform.member.tasks.index(memberConnection, {
      body: {
        sort_by: "created_at",
        sort_order: "desc",
        page: 1,
        page_size: 100,
      },
    });
  typia.assert(sortByCreatedAtResponse);
  TestValidator.predicate("sorted by created_at desc", () => {
    for (let i = 1; i < sortByCreatedAtResponse.data.length; i++) {
      if (
        new Date(sortByCreatedAtResponse.data[i].created_at).getTime() >
        new Date(sortByCreatedAtResponse.data[i - 1].created_at).getTime()
      ) {
        return false;
      }
    }
    return true;
  });
  // 9. Test sorting by priority
  const sortByPriorityResponse =
    await api.functional.hrmPlatform.member.tasks.index(memberConnection, {
      body: {
        sort_by: "priority",
        sort_order: "asc",
        page: 1,
        page_size: 100,
      },
    });
  typia.assert(sortByPriorityResponse);
  TestValidator.predicate(
    "sorted by priority",
    sortByPriorityResponse.data.length > 0,
  );
  // 10. Test pagination
  const paginatedResponse = await api.functional.hrmPlatform.member.tasks.index(
    memberConnection,
    {
      body: {
        page: 1,
        page_size: 2,
      },
    },
  );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "pagination current page",
    paginatedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    paginatedResponse.pagination.limit,
    2,
  );
  TestValidator.equals(
    "pagination records",
    paginatedResponse.pagination.records,
    5,
  );
  TestValidator.equals(
    "pagination pages",
    paginatedResponse.pagination.pages,
    3,
  );
  TestValidator.equals(
    "data length on page 1",
    paginatedResponse.data.length,
    2,
  );
  // Test page 2
  const page2Response = await api.functional.hrmPlatform.member.tasks.index(
    memberConnection,
    {
      body: {
        page: 2,
        page_size: 2,
      },
    },
  );
  typia.assert(page2Response);
  TestValidator.equals(
    "pagination current page 2",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals("data length on page 2", page2Response.data.length, 2);
  // 11. Test empty state - create a new member connection and verify they see no tasks
  // (since they are not assigned to any project)
  const newMemberConnection: api.IConnection = { host: connection.host };
  const newMemberAuth = await authorize_member_join(newMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(newMemberAuth);
  const emptyResponse = await api.functional.hrmPlatform.member.tasks.index(
    newMemberConnection,
    {
      body: {
        page: 1,
        page_size: 100,
      },
    },
  );
  typia.assert(emptyResponse);
  TestValidator.equals(
    "empty state records",
    emptyResponse.pagination.records,
    0,
  );
  TestValidator.equals("empty state pages", emptyResponse.pagination.pages, 0);
  TestValidator.equals("empty state data length", emptyResponse.data.length, 0);
}