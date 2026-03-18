import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTaskHistory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingTaskHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_hrm_time_tracking_projects_create } from "../../../generate/generate_random_hrm_time_tracking_projects_create";
import { generate_random_hrm_time_tracking_projects_tasks_create } from "../../../generate/generate_random_hrm_time_tracking_projects_tasks_create";
import { generate_random_hrm_time_tracking_projects_tasks_histories_create } from "../../../generate/generate_random_hrm_time_tracking_projects_tasks_histories_create";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_task } from "../../../prepare/prepare_random_hrm_time_tracking_task";
import { prepare_random_hrm_time_tracking_task_history } from "../../../prepare/prepare_random_hrm_time_tracking_task_history";

export async function test_api_task_history_list_filtered_within_task_scope(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "OwnerTest1234!",
      href: "https://example.com/hrm/owner/join",
      referrer: "https://example.com/hrm",
      ip: "127.0.0.1",
    } satisfies IHrmTimeTrackingOwner.IJoin,
  });
  typia.assert(owner);
  const targetProject = await generate_random_hrm_time_tracking_projects_create(
    ownerConnection,
    {
      body: {
        name: `project-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#33AA88",
        status: "active",
        budget_hours: 120,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      } satisfies IHrmTimeTrackingProject.ICreate,
    },
  );
  typia.assert(targetProject);
  const targetTask =
    await generate_random_hrm_time_tracking_projects_tasks_create(
      ownerConnection,
      {
        params: {
          projectId: targetProject.id,
        },
        body: {
          title: `task-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          status: "open",
          priority: "high",
          estimated_hours: 12,
          due_date: new Date(
            Date.now() + 3 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies IHrmTimeTrackingTask.ICreate,
      },
    );
  typia.assert(targetTask);
  const siblingTask =
    await generate_random_hrm_time_tracking_projects_tasks_create(
      ownerConnection,
      {
        params: {
          projectId: targetProject.id,
        },
        body: {
          title: `sibling-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          status: "open",
          priority: "medium",
          estimated_hours: 6,
          due_date: new Date(
            Date.now() + 4 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies IHrmTimeTrackingTask.ICreate,
      },
    );
  typia.assert(siblingTask);
  const otherProject = await generate_random_hrm_time_tracking_projects_create(
    ownerConnection,
    {
      body: {
        name: `project-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#8844CC",
        status: "active",
        budget_hours: 80,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      } satisfies IHrmTimeTrackingProject.ICreate,
    },
  );
  typia.assert(otherProject);
  const otherProjectTask =
    await generate_random_hrm_time_tracking_projects_tasks_create(
      ownerConnection,
      {
        params: {
          projectId: otherProject.id,
        },
        body: {
          title: `other-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          status: "open",
          priority: "low",
          estimated_hours: 4,
          due_date: new Date(
            Date.now() + 5 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies IHrmTimeTrackingTask.ICreate,
      },
    );
  typia.assert(otherProjectTask);
  const targetHistory1 =
    await generate_random_hrm_time_tracking_projects_tasks_histories_create(
      ownerConnection,
      {
        params: {
          projectId: targetProject.id,
          taskId: targetTask.id,
        },
        body: {
          new_status: "in-progress",
        } satisfies IHrmTimeTrackingTaskHistory.ICreate,
      },
    );
  typia.assert(targetHistory1);
  const targetHistory2 =
    await generate_random_hrm_time_tracking_projects_tasks_histories_create(
      ownerConnection,
      {
        params: {
          projectId: targetProject.id,
          taskId: targetTask.id,
        },
        body: {
          new_status: "completed",
        } satisfies IHrmTimeTrackingTaskHistory.ICreate,
      },
    );
  typia.assert(targetHistory2);
  const targetHistory3 =
    await generate_random_hrm_time_tracking_projects_tasks_histories_create(
      ownerConnection,
      {
        params: {
          projectId: targetProject.id,
          taskId: targetTask.id,
        },
        body: {
          new_status: "closed",
        } satisfies IHrmTimeTrackingTaskHistory.ICreate,
      },
    );
  typia.assert(targetHistory3);
  const siblingHistory =
    await generate_random_hrm_time_tracking_projects_tasks_histories_create(
      ownerConnection,
      {
        params: {
          projectId: targetProject.id,
          taskId: siblingTask.id,
        },
        body: {
          new_status: "in-progress",
        } satisfies IHrmTimeTrackingTaskHistory.ICreate,
      },
    );
  typia.assert(siblingHistory);
  const otherProjectHistory =
    await generate_random_hrm_time_tracking_projects_tasks_histories_create(
      ownerConnection,
      {
        params: {
          projectId: otherProject.id,
          taskId: otherProjectTask.id,
        },
        body: {
          new_status: "in-progress",
        } satisfies IHrmTimeTrackingTaskHistory.ICreate,
      },
    );
  typia.assert(otherProjectHistory);
  const allTargetHistories = [targetHistory1, targetHistory2, targetHistory3];
  const filteredSource = targetHistory2;
  const rangeStart = new Date(
    new Date(filteredSource.changed_at).getTime() - 1000,
  ).toISOString();
  const rangeEnd = new Date(
    new Date(filteredSource.changed_at).getTime() + 1000,
  ).toISOString();
  const expectedFiltered = allTargetHistories.filter(
    (history) =>
      history.actor_type === filteredSource.actor_type &&
      history.old_status === filteredSource.old_status &&
      history.new_status === filteredSource.new_status &&
      new Date(history.changed_at).getTime() >=
        new Date(rangeStart).getTime() &&
      new Date(history.changed_at).getTime() <= new Date(rangeEnd).getTime(),
  );
  const expectedFilteredIds = expectedFiltered.map((history) => history.id);
  const page1 =
    await api.functional.hrmTimeTracking.projects.tasks.histories.index(
      ownerConnection,
      {
        projectId: targetProject.id,
        taskId: targetTask.id,
        body: {
          actorType: filteredSource.actor_type,
          oldStatus: filteredSource.old_status,
          newStatus: filteredSource.new_status,
          changedAtFrom: rangeStart,
          changedAtTo: rangeEnd,
          sort: "-changed_at",
          page: 1,
          limit: 1,
        } satisfies IHrmTimeTrackingTaskHistory.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals(
    "page 1 current page matches request",
    page1.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit matches request",
    page1.pagination.limit,
    1,
  );
  TestValidator.equals(
    "filtered record count matches created target-task histories",
    page1.pagination.records,
    expectedFiltered.length,
  );
  TestValidator.equals(
    "filtered total pages matches metadata formula",
    page1.pagination.pages,
    Math.ceil(page1.pagination.records / page1.pagination.limit),
  );
  TestValidator.equals(
    "page 1 data length matches pagination expectation",
    page1.data.length,
    Math.min(page1.pagination.limit, page1.pagination.records),
  );
  for (const history of page1.data) {
    TestValidator.equals(
      "history actor type matches filter",
      history.actor_type,
      filteredSource.actor_type,
    );
    TestValidator.equals(
      "history old status matches filter",
      history.old_status,
      filteredSource.old_status,
    );
    TestValidator.equals(
      "history new status matches filter",
      history.new_status,
      filteredSource.new_status,
    );
    TestValidator.predicate(
      "history changed_at is within requested range",
      new Date(history.changed_at).getTime() >=
        new Date(rangeStart).getTime() &&
        new Date(history.changed_at).getTime() <= new Date(rangeEnd).getTime(),
    );
    TestValidator.predicate(
      "history belongs to expected filtered target-task set",
      expectedFilteredIds.includes(history.id),
    );
    TestValidator.notEquals(
      "history does not come from sibling task",
      history.id,
      siblingHistory.id,
    );
    TestValidator.notEquals(
      "history does not come from other project task",
      history.id,
      otherProjectHistory.id,
    );
  }
  const page2 =
    await api.functional.hrmTimeTracking.projects.tasks.histories.index(
      ownerConnection,
      {
        projectId: targetProject.id,
        taskId: targetTask.id,
        body: {
          actorType: filteredSource.actor_type,
          oldStatus: filteredSource.old_status,
          newStatus: filteredSource.new_status,
          changedAtFrom: rangeStart,
          changedAtTo: rangeEnd,
          sort: "-changed_at",
          page: 2,
          limit: 1,
        } satisfies IHrmTimeTrackingTaskHistory.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals(
    "page 2 limit matches request",
    page2.pagination.limit,
    1,
  );
  TestValidator.equals(
    "page 2 records metadata stays stable",
    page2.pagination.records,
    page1.pagination.records,
  );
  TestValidator.equals(
    "page 2 pages metadata stays stable",
    page2.pagination.pages,
    page1.pagination.pages,
  );
  TestValidator.predicate(
    "page 2 current page metadata is valid",
    page2.pagination.current === 2 || page2.data.length === 0,
  );
  const combined = [...page1.data, ...page2.data];
  for (let i = 1; i < combined.length; ++i) {
    TestValidator.predicate(
      "combined pages preserve descending changed_at order",
      new Date(combined[i - 1].changed_at).getTime() >=
        new Date(combined[i].changed_at).getTime(),
    );
  }
  const page1Ids = page1.data.map((history) => history.id);
  for (const history of page2.data) {
    TestValidator.predicate(
      "page 2 rows remain within expected filtered target-task set",
      expectedFilteredIds.includes(history.id),
    );
    TestValidator.predicate(
      "page 2 does not duplicate page 1 ids",
      page1Ids.includes(history.id) === false,
    );
    TestValidator.equals(
      "page 2 history actor type matches filter",
      history.actor_type,
      filteredSource.actor_type,
    );
    TestValidator.equals(
      "page 2 history old status matches filter",
      history.old_status,
      filteredSource.old_status,
    );
    TestValidator.equals(
      "page 2 history new status matches filter",
      history.new_status,
      filteredSource.new_status,
    );
    TestValidator.predicate(
      "page 2 history changed_at is within requested range",
      new Date(history.changed_at).getTime() >=
        new Date(rangeStart).getTime() &&
        new Date(history.changed_at).getTime() <= new Date(rangeEnd).getTime(),
    );
  }
}
