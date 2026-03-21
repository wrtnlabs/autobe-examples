import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_member_projects_tasks_create";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";

export async function test_api_project_tasks_filtered_listing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create a project to contain the test tasks
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Create multiple tasks with different statuses and priorities
  const taskBodies = [
    // Open tasks with various priorities
    { status: "open" as const, priority: "low" as const },
    { status: "open" as const, priority: "high" as const },
    { status: "open" as const, priority: "urgent" as const },
    // In-progress tasks
    { status: "in-progress" as const, priority: "medium" as const },
    { status: "in-progress" as const, priority: "high" as const },
    // Completed tasks
    { status: "completed" as const, priority: "low" as const },
    { status: "completed" as const, priority: "medium" as const },
    // Closed tasks
    { status: "closed" as const, priority: "urgent" as const },
  ];
  const createdTasks = await ArrayUtil.asyncRepeat(
    taskBodies.length,
    async (index) => {
      const body = taskBodies[index];
      const task = await generate_random_erp_hrm_member_projects_tasks_create(
        memberConnection,
        {
          params: { projectId: project.id },
          body: {
            title: `Test Task ${index + 1} - ${body.status} - ${body.priority}`,
            priority: body.priority,
            status: body.status,
            description: `Description for task ${index + 1}`,
          },
        },
      );
      typia.assert(task);
      return task;
    },
  );
  // 4. Test: Filter by status 'open' - verify only open tasks returned
  const openTasksResponse =
    await api.functional.erpHrm.member.projects.tasks.index(memberConnection, {
      projectId: project.id,
      body: { status: "open" },
    });
  typia.assert(openTasksResponse);
  TestValidator.equals(
    "open tasks pagination structure",
    typeof openTasksResponse.pagination,
    "object",
  );
  TestValidator.predicate("open tasks have correct status", () => {
    return openTasksResponse.data.every((task) => task.status === "open");
  });
  TestValidator.equals(
    "open tasks count matches",
    openTasksResponse.data.length,
    3,
  );
  // 5. Test: Filter by priority 'high' - verify only high priority tasks returned
  const highPriorityResponse =
    await api.functional.erpHrm.member.projects.tasks.index(memberConnection, {
      projectId: project.id,
      body: { priority: "high" },
    });
  typia.assert(highPriorityResponse);
  TestValidator.predicate("high priority tasks have correct priority", () => {
    return highPriorityResponse.data.every((task) => task.priority === "high");
  });
  TestValidator.equals(
    "high priority tasks count matches",
    highPriorityResponse.data.length,
    2,
  );
  // 6. Test: Filter with no filters - verify all project tasks returned
  const allTasksResponse =
    await api.functional.erpHrm.member.projects.tasks.index(memberConnection, {
      projectId: project.id,
      body: {},
    });
  typia.assert(allTasksResponse);
  TestValidator.equals("all tasks count", allTasksResponse.data.length, 8);
  TestValidator.predicate("pagination metadata present", () => {
    return (
      allTasksResponse.pagination.current === 1 &&
      allTasksResponse.pagination.limit > 0 &&
      allTasksResponse.pagination.records >= 8 &&
      allTasksResponse.pagination.pages >= 1
    );
  });
  // 7. Test: Combined filter (status + priority) - verify AND logic applied
  const combinedFilterResponse =
    await api.functional.erpHrm.member.projects.tasks.index(memberConnection, {
      projectId: project.id,
      body: { status: "open", priority: "high" },
    });
  typia.assert(combinedFilterResponse);
  TestValidator.predicate("combined filter - all tasks match status", () => {
    return combinedFilterResponse.data.every((task) => task.status === "open");
  });
  TestValidator.predicate("combined filter - all tasks match priority", () => {
    return combinedFilterResponse.data.every(
      (task) => task.priority === "high",
    );
  });
  TestValidator.equals(
    "combined filter count",
    combinedFilterResponse.data.length,
    1,
  );
  // 8. Test: Empty result when no matches (not an error)
  const noMatchResponse =
    await api.functional.erpHrm.member.projects.tasks.index(memberConnection, {
      projectId: project.id,
      body: { status: "closed", priority: "low" },
    });
  typia.assert(noMatchResponse);
  TestValidator.equals(
    "no match data array empty",
    noMatchResponse.data.length,
    0,
  );
  TestValidator.predicate("pagination still present for empty results", () => {
    return (
      noMatchResponse.pagination.current === 1 &&
      noMatchResponse.pagination.records === 0 &&
      noMatchResponse.pagination.pages === 0
    );
  });
  // 9. Validate response structure - IErpHrmTask.ISummary fields present
  const sampleTask = allTasksResponse.data[0];
  TestValidator.predicate("task has id", () => sampleTask.id !== undefined);
  TestValidator.predicate(
    "task has title",
    () => sampleTask.title !== undefined,
  );
  TestValidator.predicate(
    "task has status",
    () => sampleTask.status !== undefined,
  );
  TestValidator.predicate(
    "task has priority",
    () => sampleTask.priority !== undefined,
  );
  TestValidator.predicate(
    "task has project",
    () => sampleTask.project !== undefined,
  );
  TestValidator.predicate(
    "task has subtasks_count",
    () => sampleTask.subtasks_count !== undefined,
  );
  TestValidator.predicate(
    "task has task_histories_count",
    () => sampleTask.task_histories_count !== undefined,
  );
  TestValidator.predicate(
    "task has timelogs_count",
    () => sampleTask.timelogs_count !== undefined,
  );
  TestValidator.predicate(
    "task has timers_count",
    () => sampleTask.timers_count !== undefined,
  );
  // 10. Validate project association
  TestValidator.equals(
    "all tasks belong to same project",
    sampleTask.project.id,
    project.id,
  );
}
