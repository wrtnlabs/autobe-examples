import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import type { IHrmTrackerProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProject";
import type { IHrmTrackerProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProjectMember";
import type { IHrmTrackerTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTask";
import type { IHrmTrackerTaskSortOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTaskSortOption";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTrackerTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_tracker_member_projects_create } from "../../../generate/generate_random_hrm_tracker_member_projects_create";
import { generate_random_hrm_tracker_member_projects_project_members_create } from "../../../generate/generate_random_hrm_tracker_member_projects_project_members_create";
import { generate_random_hrm_tracker_member_projects_tasks_create } from "../../../generate/generate_random_hrm_tracker_member_projects_tasks_create";
import { prepare_random_hrm_tracker_project } from "../../../prepare/prepare_random_hrm_tracker_project";
import { prepare_random_hrm_tracker_project_member } from "../../../prepare/prepare_random_hrm_tracker_project_member";
import { prepare_random_hrm_tracker_task } from "../../../prepare/prepare_random_hrm_tracker_task";

export async function test_api_project_task_filtering_and_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
      phone: null,
    },
  });
  // 2. Create a project
  const project = await generate_random_hrm_tracker_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color: "#FF5733",
      },
    },
  );
  typia.assert(project);
  // 3. Invite employees to the project
  const employees = ArrayUtil.repeat(3, () => ({
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: "12345678",
  }));
  const projectMembers: IHrmTrackerProjectMember[] = [];
  for (const emp of employees) {
    const employeeConnection: api.IConnection = { host: connection.host };
    const joinedEmployee = await authorize_member_join(employeeConnection, {
      body: emp,
    });
    const projectMember =
      await generate_random_hrm_tracker_member_projects_project_members_create(
        memberConnection,
        {
          params: { projectId: project.id },
          body: {
            hrm_tracker_employee_id: joinedEmployee.id,
            role: "member" as const,
          },
        },
      );
    projectMembers.push(projectMember);
    typia.assert(projectMember);
  }
  // 4. Create multiple tasks with varied statuses, priorities, and assignments
  const tasks = ArrayUtil.repeat(10, (i) => {
    const statuses: IHrmTrackerTask.ICreate["status"][] = [
      "open",
      "in-progress",
      "completed",
      "closed",
    ];
    const priorities: IHrmTrackerTask.ICreate["priority"][] = [
      "low",
      "medium",
      "high",
      "urgent",
    ];
    return generate_random_hrm_tracker_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          title: `Task ${i + 1}: ${RandomGenerator.paragraph({ sentences: 2 })}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          status: statuses[i % 4],
          priority: priorities[i % 4],
          due_date: new Date(
            new Date().getTime() + i * 24 * 60 * 60 * 1000,
          ).toISOString(),
          assigned_employee_id:
            i < 3 ? projectMembers[i]?.hrm_tracker_employee_id : undefined,
        },
      },
    );
  });
  await Promise.all(tasks.map((t) => t.then((task) => typia.assert(task))));
  const createdTasks = await Promise.all(tasks);
  // 5. Test filtering by single status ('in-progress')
  const inProgressTasks = createdTasks.filter(
    (t) => t.status === "in-progress",
  );
  const inProgressResponse =
    await api.functional.hrmTracker.member.projects.tasks.index(
      memberConnection,
      {
        projectId: project.id,
        body: { status: "in-progress" } satisfies IHrmTrackerTask.IRequest,
      },
    );
  typia.assert(inProgressResponse);
  TestValidator.equals(
    "filter by status 'in-progress' count",
    inProgressResponse.data.length,
    inProgressTasks.length,
  );
  TestValidator.predicate(
    "filter by status 'in-progress' contains expected tasks",
    inProgressResponse.data.every((t) => t.status === "in-progress"),
  );
  // 6. Test filtering by priority level
  const urgentTasks = createdTasks.filter((t) => t.priority === "urgent");
  const urgentResponse =
    await api.functional.hrmTracker.member.projects.tasks.index(
      memberConnection,
      {
        projectId: project.id,
        body: { priority: "urgent" } satisfies IHrmTrackerTask.IRequest,
      },
    );
  typia.assert(urgentResponse);
  TestValidator.equals(
    "filter by priority 'urgent' count",
    urgentResponse.data.length,
    urgentTasks.length,
  );
  // 7. Test filtering by assigned employee ID
  const assignedEmployee = projectMembers[0];
  const assignedTasks = createdTasks.filter(
    (t) =>
      t.assigned_employee?.id === assignedEmployee?.hrm_tracker_employee_id,
  );
  const assignedResponse =
    await api.functional.hrmTracker.member.projects.tasks.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          assignedEmployeeId: assignedEmployee?.hrm_tracker_employee_id,
        } satisfies IHrmTrackerTask.IRequest,
      },
    );
  typia.assert(assignedResponse);
  TestValidator.equals(
    "filter by assigned employee ID count",
    assignedResponse.data.length,
    assignedTasks.length,
  );
  // 8. Test full-text search by task title keywords
  const keyword = createdTasks[0].title.split(":")[0].trim();
  const searchResponse =
    await api.functional.hrmTracker.member.projects.tasks.index(
      memberConnection,
      {
        projectId: project.id,
        body: { search: keyword } satisfies IHrmTrackerTask.IRequest,
      },
    );
  typia.assert(searchResponse);
  TestValidator.predicate(
    "search by keyword returns results",
    searchResponse.data.length > 0,
  );
  TestValidator.predicate(
    "search results contain keyword in title",
    searchResponse.data.every((t) => t.title.includes(keyword)),
  );
  // 9. Test combined filter (status + priority + search)
  const combinedTasks = createdTasks.filter(
    (t) =>
      t.status === "in-progress" &&
      t.priority === "high" &&
      t.title.includes("Task"),
  );
  const combinedResponse =
    await api.functional.hrmTracker.member.projects.tasks.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          status: "in-progress",
          priority: "high",
          search: "Task",
        } satisfies IHrmTrackerTask.IRequest,
      },
    );
  typia.assert(combinedResponse);
  TestValidator.equals(
    "combined filter count",
    combinedResponse.data.length,
    combinedTasks.length,
  );
  // 10. Test sorting by different fields in ascending and descending order
  // Sort by id ascending
  const idAscResponse =
    await api.functional.hrmTracker.member.projects.tasks.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          sort: [{ field: "id", direction: "asc" } as const],
        } satisfies IHrmTrackerTask.IRequest,
      },
    );
  typia.assert(idAscResponse);
  const sortedByIdAsc = [...createdTasks].sort((a, b) =>
    a.id.localeCompare(b.id),
  );
  TestValidator.equals(
    "sort by id ascending",
    idAscResponse.data.map((t) => t.id),
    sortedByIdAsc.map((t) => t.id),
  );
  // Sort by title descending
  const titleDescResponse =
    await api.functional.hrmTracker.member.projects.tasks.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          sort: [{ field: "title", direction: "desc" } as const],
        } satisfies IHrmTrackerTask.IRequest,
      },
    );
  typia.assert(titleDescResponse);
  const sortedByTitleDesc = [...createdTasks].sort((a, b) =>
    b.title.localeCompare(a.title),
  );
  TestValidator.equals(
    "sort by title descending",
    titleDescResponse.data.map((t) => t.title),
    sortedByTitleDesc.map((t) => t.title),
  );
  // Sort by due_date ascending
  const dueDateAscResponse =
    await api.functional.hrmTracker.member.projects.tasks.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          sort: [{ field: "due_date", direction: "asc" } as const],
        } satisfies IHrmTrackerTask.IRequest,
      },
    );
  typia.assert(dueDateAscResponse);
  const sortedByDueDateAsc = [...createdTasks].sort((a, b) => {
    const aDue = (a.due_date ?? null) as
      | (string & tags.Format<"date-time">)
      | null;
    const bDue = (b.due_date ?? null) as
      | (string & tags.Format<"date-time">)
      | null;
    if (aDue === null && bDue === null) return 0;
    if (aDue === null) return 1;
    if (bDue === null) return -1;
    return aDue.localeCompare(bDue);
  });
  TestValidator.equals(
    "sort by due_date ascending",
    dueDateAscResponse.data.map((t) => t.due_date ?? null),
    sortedByDueDateAsc.map((t) => t.due_date ?? null),
  );
}
