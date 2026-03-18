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
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_task } from "../../../prepare/prepare_random_hrm_time_tracking_task";

export async function test_api_task_history_list_authorized_project_timeline(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(ownerAuth);
  const project = await generate_random_hrm_time_tracking_projects_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        color_code: "#" + RandomGenerator.alphabets(6),
        status: "active",
        budget_hours: 40,
      },
    },
  );
  typia.assert(project);
  const task = await generate_random_hrm_time_tracking_projects_tasks_create(
    ownerConnection,
    {
      params: {
        projectId: project.id,
      },
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        status: "open",
        priority: "high",
        estimated_hours: 8,
      },
    },
  );
  typia.assert(task);
  const originalTaskId = task.id;
  const originalTaskStatus = task.status;
  const request = {
    page: 1,
    limit: 10,
    sort: "-changed_at",
  } satisfies IHrmTimeTrackingTaskHistory.IRequest;
  const histories =
    await api.functional.hrmTimeTracking.projects.tasks.histories.index(
      ownerConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: request,
      },
    );
  typia.assert(histories);
  TestValidator.equals(
    "pagination current page",
    histories.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "pagination limit",
    histories.pagination.limit,
    request.limit,
  );
  TestValidator.predicate(
    "records not less than data length",
    histories.pagination.records >= histories.data.length,
  );
  TestValidator.predicate(
    "pages coherent when empty",
    histories.pagination.records === 0
      ? histories.pagination.pages === 0
      : histories.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "current page within total pages when pages exist",
    histories.pagination.pages === 0 ||
      histories.pagination.current <= histories.pagination.pages,
  );
  for (const history of histories.data) {
    typia.assert(history);
    TestValidator.predicate("history id exists", history.id.length > 0);
    TestValidator.predicate(
      "history actor_type exists",
      history.actor_type.length > 0,
    );
    TestValidator.predicate(
      "history old_status exists",
      history.old_status.length > 0,
    );
    TestValidator.predicate(
      "history new_status exists",
      history.new_status.length > 0,
    );
    TestValidator.predicate(
      "history changed_at parseable",
      Number.isNaN(new Date(history.changed_at).getTime()) === false,
    );
  }
  for (let i = 1; i < histories.data.length; ++i) {
    const previousChangedAt = new Date(
      histories.data[i - 1].changed_at,
    ).getTime();
    const currentChangedAt = new Date(histories.data[i].changed_at).getTime();
    TestValidator.predicate(
      "history sorted by changed_at descending",
      previousChangedAt >= currentChangedAt,
    );
  }
  TestValidator.equals(
    "task id unchanged after history query",
    task.id,
    originalTaskId,
  );
  TestValidator.equals(
    "task status unchanged after history query",
    task.status,
    originalTaskStatus,
  );
}
