import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_create";
import { generate_random_hrm_time_tracking_member_projects_tasks_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_tasks_create";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_task } from "../../../prepare/prepare_random_hrm_time_tracking_task";

export async function test_api_project_tasks_filter_combination(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(member);
  const project = await api.functional.hrmTimeTracking.member.projects.create(
    memberConnection,
    {
      body: {
        name: `Task Filter Project ${RandomGenerator.alphaNumeric(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        colorCode: "#3366ff",
        status: "active",
        budgetHours: 100,
      } satisfies IHrmTimeTrackingProject.ICreate,
    },
  );
  typia.assert(project);
  const sharedDueDate = "2026-03-20T09:00:00.000Z";
  const outsideDueDate = "2026-03-28T09:00:00.000Z";
  const taskBodies: IHrmTimeTrackingTask.ICreate[] = [
    {
      title: `Filter Match Alpha ${RandomGenerator.alphaNumeric(6)}`,
      description: "Alpha ticket for combined filter validation",
      status: "open",
      priority: "high",
      estimatedHours: 4,
      dueDate: sharedDueDate,
    },
    {
      title: `Filter Match Beta ${RandomGenerator.alphaNumeric(6)}`,
      description: "Beta ticket for the same search group",
      status: "open",
      priority: "high",
      estimatedHours: 6,
      dueDate: sharedDueDate,
    },
    {
      title: `Closed Task ${RandomGenerator.alphaNumeric(6)}`,
      description: "This task should fail the status filter",
      status: "closed",
      priority: "high",
      estimatedHours: 3,
      dueDate: sharedDueDate,
    },
    {
      title: `Low Priority Task ${RandomGenerator.alphaNumeric(6)}`,
      description: "This task should fail the priority filter",
      status: "open",
      priority: "low",
      estimatedHours: 2,
      dueDate: sharedDueDate,
    },
    {
      title: `Future Search Candidate ${RandomGenerator.alphaNumeric(6)}`,
      description: "This task should fail the due date filter",
      status: "open",
      priority: "high",
      estimatedHours: 5,
      dueDate: outsideDueDate,
    },
  ];
  const createdTasks = await ArrayUtil.asyncMap(taskBodies, async (body) => {
    const task =
      await api.functional.hrmTimeTracking.member.projects.tasks.create(
        memberConnection,
        {
          projectId: project.id,
          body,
        },
      );
    typia.assert(task);
    return task;
  });
  const broadResult =
    await api.functional.hrmTimeTracking.member.projects.tasks.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          status: "open",
          priority: "high",
          search: "Filter Match",
          dueDateFrom: "2026-03-19T00:00:00.000Z",
          dueDateTo: "2026-03-21T23:59:59.999Z",
          sort: "createdAtAsc",
          page: 1,
          limit: 10,
        } satisfies IHrmTimeTrackingTask.IRequest,
      },
    );
  typia.assert(broadResult);
  TestValidator.equals(
    "combined filter should return two tasks",
    broadResult.data.length,
    2,
  );
  TestValidator.equals(
    "combined filter should report matching record count",
    broadResult.pagination.records,
    2,
  );
  TestValidator.predicate(
    "all returned tasks should belong to the target project",
    broadResult.data.every((task) => task.project.id === project.id),
  );
  TestValidator.predicate(
    "all returned tasks should satisfy the requested filters",
    broadResult.data.every(
      (task) =>
        task.status === "open" &&
        task.priority === "high" &&
        task.due_date !== null &&
        task.due_date >= "2026-03-19T00:00:00.000Z" &&
        task.due_date <= "2026-03-21T23:59:59.999Z" &&
        task.title.includes("Filter Match"),
    ),
  );
  TestValidator.equals(
    "paged result should stay on first page",
    broadResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "page size should reflect requested limit",
    broadResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "filter result should contain only the matching created tasks",
    broadResult.data.every((task) =>
      createdTasks.some((created) => created.id === task.id),
    ),
  );
  const emptyResult =
    await api.functional.hrmTimeTracking.member.projects.tasks.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          status: "open",
          priority: "urgent",
          search: "no-such-title",
          dueDateFrom: "2026-04-01T00:00:00.000Z",
          dueDateTo: "2026-04-02T23:59:59.999Z",
          sort: "createdAtAsc",
          page: 1,
          limit: 10,
        } satisfies IHrmTimeTrackingTask.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "no match should return empty data",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty result records should be zero",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result pages should be zero",
    emptyResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty result current page should be one",
    emptyResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty result limit should reflect request",
    emptyResult.pagination.limit,
    10,
  );
}
