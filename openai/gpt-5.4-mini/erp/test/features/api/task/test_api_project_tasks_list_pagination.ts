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

export async function test_api_project_tasks_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  const project =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberConnection,
      {
        body: {
          name: `task-pagination-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          colorCode: `#${RandomGenerator.alphabets(6)}`,
          status: "active",
          budgetHours: 120,
        } satisfies IHrmTimeTrackingProject.ICreate,
      },
    );
  typia.assert(project);
  const titles = [
    `alpha-${RandomGenerator.alphabets(5)}`,
    `beta-${RandomGenerator.alphabets(5)}`,
    `gamma-${RandomGenerator.alphabets(5)}`,
    `delta-${RandomGenerator.alphabets(5)}`,
    `epsilon-${RandomGenerator.alphabets(5)}`,
  ] as const;
  const createdTasks = await ArrayUtil.asyncMap(
    titles,
    async (title, index) => {
      const task =
        await generate_random_hrm_time_tracking_member_projects_tasks_create(
          memberConnection,
          {
            params: { projectId: project.id },
            body: {
              title,
              description: RandomGenerator.paragraph({ sentences: 3 }),
              status: index % 2 === 0 ? "open" : "in_progress",
              priority: ["low", "medium", "high", "urgent", "low"][index],
              estimatedHours: index + 1,
              dueDate: new Date(Date.UTC(2026, 0, index + 2)).toISOString(),
            } satisfies IHrmTimeTrackingTask.ICreate,
          },
        );
      typia.assert(task);
      return task;
    },
  );
  const taskSnapshots = new Map(
    createdTasks.map(
      (task) =>
        [
          task.id,
          {
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            dueDate: task.dueDate,
            projectId: task.project.id,
            assigneeId: task.assignee?.id ?? null,
            parentId: task.parent?.id ?? null,
          },
        ] as const,
    ),
  );
  const firstPage =
    await api.functional.hrmTimeTracking.member.projects.tasks.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          page: 1,
          limit: 2,
          sort: "createdAtAsc",
        } satisfies IHrmTimeTrackingTask.IRequest,
      },
    );
  typia.assert(firstPage);
  const secondPage =
    await api.functional.hrmTimeTracking.member.projects.tasks.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          page: 2,
          limit: 2,
          sort: "createdAtAsc",
        } satisfies IHrmTimeTrackingTask.IRequest,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals(
    "pagination current page",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", firstPage.pagination.limit, 2);
  TestValidator.equals(
    "pagination total records",
    firstPage.pagination.records,
    createdTasks.length,
  );
  TestValidator.equals(
    "pagination total pages",
    firstPage.pagination.pages,
    Math.ceil(createdTasks.length / 2),
  );
  TestValidator.equals("first page size", firstPage.data.length, 2);
  TestValidator.equals("second page current", secondPage.pagination.current, 2);
  TestValidator.equals("second page limit", secondPage.pagination.limit, 2);
  TestValidator.equals(
    "second page total records",
    secondPage.pagination.records,
    createdTasks.length,
  );
  TestValidator.equals(
    "second page total pages",
    secondPage.pagination.pages,
    Math.ceil(createdTasks.length / 2),
  );
  const combinedIds = [...firstPage.data, ...secondPage.data].map(
    (task) => task.id,
  );
  TestValidator.predicate(
    "combined pages stay within the requested project",
    [...firstPage.data, ...secondPage.data].every(
      (task) => task.project.id === project.id,
    ),
  );
  TestValidator.predicate(
    "combined pages contain unique task identifiers",
    new Set(combinedIds).size === combinedIds.length,
  );
  TestValidator.predicate(
    "combined pages cover returned records only from the created dataset",
    combinedIds.every((id) => taskSnapshots.has(id)),
  );
  TestValidator.predicate(
    "first page is sorted by createdAt ascending",
    firstPage.data.length < 2 ||
      firstPage.data[0].created_at <= firstPage.data[1].created_at,
  );
  TestValidator.predicate(
    "second page is sorted by createdAt ascending",
    secondPage.data.length < 2 ||
      secondPage.data[0].created_at <= secondPage.data[1].created_at,
  );
  for (const task of createdTasks) {
    const snapshot = taskSnapshots.get(task.id);
    TestValidator.predicate(
      "snapshot exists for created task",
      snapshot !== undefined,
    );
    if (snapshot !== undefined) {
      TestValidator.equals(
        `task ${task.id} was not mutated by browsing`,
        snapshot,
        {
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          dueDate: task.dueDate,
          projectId: task.project.id,
          assigneeId: task.assignee?.id ?? null,
          parentId: task.parent?.id ?? null,
        },
      );
    }
  }
}
