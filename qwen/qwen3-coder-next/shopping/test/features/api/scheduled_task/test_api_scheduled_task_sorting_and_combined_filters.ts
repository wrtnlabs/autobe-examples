import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallScheduledTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallScheduledTask";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallScheduledTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallScheduledTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_scheduled_task_sorting_and_combined_filters(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin login
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // Step 2: Search with sorting by next_execution_at ascending
  const sortedByTime =
    await api.functional.ecommerceMall.admin.scheduled_tasks.index(
      adminConnection,
      {
        body: {
          search: "",
          status: "",
          last_execution_status: "",
          is_active: true,
          page: 1,
          limit: 20,
          sort_by: "next_execution_at",
          sort_order: "asc",
        } satisfies IEcommerceMallScheduledTask.IRequest,
      },
    );
  typia.assert(sortedByTime);
  // Step 3: Verify tasks are ordered chronologically by next_execution_at
  for (let i = 1; i < sortedByTime.data.length; i++) {
    const prev = new Date(sortedByTime.data[i - 1].next_execution_at);
    const curr = new Date(sortedByTime.data[i].next_execution_at);
    TestValidator.predicate(
      "tasks sorted by next_execution_at ascending",
      prev <= curr,
    );
  }
  // Step 4: Search with sorting by status descending
  const sortedByStatus =
    await api.functional.ecommerceMall.admin.scheduled_tasks.index(
      adminConnection,
      {
        body: {
          search: "",
          status: "",
          last_execution_status: "",
          is_active: true,
          page: 1,
          limit: 20,
          sort_by: "status",
          sort_order: "desc",
        } satisfies IEcommerceMallScheduledTask.IRequest,
      },
    );
  typia.assert(sortedByStatus);
  // Step 5: Verify status ordering (valid status values from the DTO)
  const statusOrder = [
    "completed",
    "running",
    "pending",
    "failed",
    "paused",
  ] as const;
  for (let i = 1; i < sortedByStatus.data.length; i++) {
    const prevStatus = sortedByStatus.data[i - 1].status;
    const currStatus = sortedByStatus.data[i].status;
    // Only check ordering if both are in our statusOrder
    const prevIndex = statusOrder.indexOf(
      prevStatus as (typeof statusOrder)[number],
    );
    const currIndex = statusOrder.indexOf(
      currStatus as (typeof statusOrder)[number],
    );
    // If both statuses are in our order list, verify ordering
    if (prevIndex !== -1 && currIndex !== -1) {
      TestValidator.predicate(
        "tasks sorted by status descending",
        prevIndex >= currIndex,
      );
    }
  }
  // Step 6: Search with combined filters (search='cleanup', status='pending') with sort_by='next_execution_at'
  const filteredAndSorted =
    await api.functional.ecommerceMall.admin.scheduled_tasks.index(
      adminConnection,
      {
        body: {
          search: "cleanup",
          status: "pending",
          last_execution_status: "",
          is_active: true,
          page: 1,
          limit: 20,
          sort_by: "next_execution_at",
          sort_order: "asc",
        } satisfies IEcommerceMallScheduledTask.IRequest,
      },
    );
  typia.assert(filteredAndSorted);
  // Step 7: Verify all criteria are met and results are properly sorted
  for (const task of filteredAndSorted.data) {
    TestValidator.predicate(
      "task name or description contains cleanup",
      task.name.toLowerCase().includes("cleanup") ||
        (task.description !== null &&
          task.description !== undefined &&
          task.description.toLowerCase().includes("cleanup")),
    );
    TestValidator.equals("task status is pending", task.status, "pending");
  }
  for (let i = 1; i < filteredAndSorted.data.length; i++) {
    const prev = new Date(filteredAndSorted.data[i - 1].next_execution_at);
    const curr = new Date(filteredAndSorted.data[i].next_execution_at);
    TestValidator.predicate(
      "filtered results sorted by next_execution_at",
      prev <= curr,
    );
  }
}
