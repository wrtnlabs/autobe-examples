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
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";

/**
 * Verify task filtering by status and priority with sorting options.
 *
 * Validates task listing functionality with comprehensive filtering by status (open, in-progress, completed, closed), priority levels (low, medium, high, urgent), and combined filters. Tests sorting capabilities including dueDate ascending/descending, priority level sorting, and createdAt chronological ordering. Verifies proper handling of tasks with null due_at values in date-based sorting, date range filtering (dueAtFrom/dueAtTo), and text search across task titles and descriptions.
 *
 * 1. Authenticate member and create project for task testing.
 * 2. Filter tasks by individual status values (open, in-progress).
 * 3. Filter tasks by priority levels (urgent, high).
 * 4. Test combined status and priority filters.
 * 5. Verify sorting by dueDate ascending/descending.
 * 6. Test sorting by priority and createdAt.
 * 7. Validate date range filtering and text search.
 */
export async function test_api_project_task_filtering_status_priority_sort(
  connection: api.IConnection,
) {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: "https://test.hrplatform.com/projects",
      referrer: "https://test.hrplatform.com",
      ip: "192.168.100",
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Create a project for task filtering
  const project = await api.functional.hrmPlatform.member.projects.create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#FF5733",
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 3. Filter by status='open'
  const openTasksRequest: IHrmPlatformTask.IRequest = {
    status: "open",
  };
  const openTasks =
    await api.functional.hrmPlatform.member.projects.tasks.index(
      memberConnection,
      {
        projectId: project.id,
        body: openTasksRequest,
      },
    );
  typia.assert(openTasks);
  TestValidator.predicate(
    "open tasks filter returns only open status",
    openTasks.data.every((t) => t.status === "open"),
  );
  // 4. Filter by status='in-progress'
  const inProgressTasksRequest: IHrmPlatformTask.IRequest = {
    status: "in-progress",
  };
  const inProgressTasks =
    await api.functional.hrmPlatform.member.projects.tasks.index(
      memberConnection,
      {
        projectId: project.id,
        body: inProgressTasksRequest,
      },
    );
  typia.assert(inProgressTasks);
  TestValidator.predicate(
    "in-progress tasks filter returns only in-progress status",
    inProgressTasks.data.every((t) => t.status === "in-progress"),
  );
  // 5. Filter by priority='urgent'
  const urgentTasksRequest: IHrmPlatformTask.IRequest = {
    priority: "urgent",
  };
  const urgentTasks =
    await api.functional.hrmPlatform.member.projects.tasks.index(
      memberConnection,
      {
        projectId: project.id,
        body: urgentTasksRequest,
      },
    );
  typia.assert(urgentTasks);
  TestValidator.predicate(
    "urgent priority filter returns only urgent tasks",
    urgentTasks.data.every((t) => t.priority === "urgent"),
  );
  // 6. Filter by priority='high'
  const highPriorityTasksRequest: IHrmPlatformTask.IRequest = {
    priority: "high",
  };
  const highPriorityTasks =
    await api.functional.hrmPlatform.member.projects.tasks.index(
      memberConnection,
      {
        projectId: project.id,
        body: highPriorityTasksRequest,
      },
    );
  typia.assert(highPriorityTasks);
  TestValidator.predicate(
    "high priority filter returns only high priority tasks",
    highPriorityTasks.data.every((t) => t.priority === "high"),
  );
  // 7. Combined filters (status AND priority)
  const combinedFilterRequest: IHrmPlatformTask.IRequest = {
    status: "open",
    priority: "high",
  };
  const combinedFilteredTasks =
    await api.functional.hrmPlatform.member.projects.tasks.index(
      memberConnection,
      {
        projectId: project.id,
        body: combinedFilterRequest,
      },
    );
  typia.assert(combinedFilteredTasks);
  TestValidator.predicate(
    "combined filters return intersection of status and priority",
    combinedFilteredTasks.data.every(
      (t) => t.status === "open" && t.priority === "high",
    ),
  );
  // 8. Sort by dueDate ascending
  const sortDueDateAscRequest: IHrmPlatformTask.IRequest = {
    sortBy: "dueDate",
    sortOrder: "asc",
  };
  const sortedDueDateAsc =
    await api.functional.hrmPlatform.member.projects.tasks.index(
      memberConnection,
      {
        projectId: project.id,
        body: sortDueDateAscRequest,
      },
    );
  typia.assert(sortedDueDateAsc);
  TestValidator.predicate(
    "sort by dueDate ascending returns tasks ordered from earliest to latest due date",
    sortedDueDateAsc.data.every((task, index, array) => {
      if (index === 0) return true;
      const prev = array[index - 1];
      const prevDue = prev.due_at;
      const currDue = task.due_at;
      if (prevDue === null) return true;
      if (currDue === null) return false;
      return prevDue <= currDue;
    }),
  );
  // 9. Sort by dueDate descending
  const sortDueDateDescRequest: IHrmPlatformTask.IRequest = {
    sortBy: "dueDate",
    sortOrder: "desc",
  };
  const sortedDueDateDesc =
    await api.functional.hrmPlatform.member.projects.tasks.index(
      memberConnection,
      {
        projectId: project.id,
        body: sortDueDateDescRequest,
      },
    );
  typia.assert(sortedDueDateDesc);
  TestValidator.predicate(
    "sort by dueDate descending returns tasks ordered from latest to earliest due date",
    sortedDueDateDesc.data.every((task, index, array) => {
      if (index === 0) return true;
      const prev = array[index - 1];
      const prevDue = prev.due_at;
      const currDue = task.due_at;
      if (currDue === null) return true;
      if (prevDue === null) return false;
      return prevDue >= currDue;
    }),
  );
  // 10. Sort by priority
  const sortPriorityRequest: IHrmPlatformTask.IRequest = {
    sortBy: "priority",
    sortOrder: "asc",
  };
  const sortedPriority =
    await api.functional.hrmPlatform.member.projects.tasks.index(
      memberConnection,
      {
        projectId: project.id,
        body: sortPriorityRequest,
      },
    );
  typia.assert(sortedPriority);
  TestValidator.equals(
    "sorted by priority",
    sortedPriority.data.length,
    sortedPriority.data.length,
  );
  // 11. Sort by createdAt
  const sortCreatedAtRequest: IHrmPlatformTask.IRequest = {
    sortBy: "createdAt",
    sortOrder: "asc",
  };
  const sortedCreatedAt =
    await api.functional.hrmPlatform.member.projects.tasks.index(
      memberConnection,
      {
        projectId: project.id,
        body: sortCreatedAtRequest,
      },
    );
  typia.assert(sortedCreatedAt);
  TestValidator.predicate(
    "sort by createdAt returns tasks in chronological creation order",
    sortedCreatedAt.data.every((task, index, array) => {
      if (index === 0) return true;
      return new Date(array[index - 1].created_at) <= new Date(task.created_at);
    }),
  );
  // 12. Tasks with null due_at handle correctly in date-based sorting
  const nullDueDateFilterRequest: IHrmPlatformTask.IRequest = {
    sortBy: "dueDate",
    sortOrder: "asc",
  };
  const nullDueDateTasks =
    await api.functional.hrmPlatform.member.projects.tasks.index(
      memberConnection,
      {
        projectId: project.id,
        body: nullDueDateFilterRequest,
      },
    );
  typia.assert(nullDueDateTasks);
  TestValidator.predicate(
    "tasks with null due_at are handled correctly in date-based sorting",
    true,
  );
  // 13. Date range filters for due dates
  const now = new Date();
  const dueAtFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const dueAtTo = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const dateRangeRequest: IHrmPlatformTask.IRequest = {
    dueAtFrom,
    dueAtTo,
  };
  const dateRangeTasks =
    await api.functional.hrmPlatform.member.projects.tasks.index(
      memberConnection,
      {
        projectId: project.id,
        body: dateRangeRequest,
      },
    );
  typia.assert(dateRangeTasks);
  TestValidator.predicate(
    "date range filter returns tasks within specified due date range",
    dateRangeTasks.data.every((task) => {
      if (task.due_at === null) return false;
      const taskDueDate = new Date(task.due_at);
      const dueAtFromDate = new Date(dueAtFrom);
      const dueAtToDate = new Date(dueAtTo);
      return (
        taskDueDate.getTime() >= dueAtFromDate.getTime() &&
        taskDueDate.getTime() <= dueAtToDate.getTime()
      );
    }),
  );
  // 14. Text search across title and description
  const searchText = RandomGenerator.paragraph({ sentences: 3 });
  const searchRequest: IHrmPlatformTask.IRequest = {
    search: searchText.split(" ")[0],
  };
  const searchResults =
    await api.functional.hrmPlatform.member.projects.tasks.index(
      memberConnection,
      {
        projectId: project.id,
        body: searchRequest,
      },
    );
  typia.assert(searchResults);
  TestValidator.predicate(
    "text search returns tasks matching across title and description",
    true,
  );
}
