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

export async function test_api_scheduled_task_search_and_filter(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await api.functional.ecommerceMall.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IEcommerceMallAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  adminConnection.headers = { Authorization: adminAuth.token.access };
  // Step 2: Create multiple scheduled tasks with varying properties
  const tasks = await ArrayUtil.asyncRepeat(5, async (index) => {
    const name =
      index === 0
        ? "daily-backup"
        : index === 1
          ? "hourly-cleanup"
          : index === 2
            ? "weekly-report"
            : `task-${index}`;
    const status =
      index === 0
        ? "pending"
        : index === 1
          ? "completed"
          : index === 2
            ? "failed"
            : "pending";
    const is_active = index % 2 === 0;
    const response =
      await api.functional.ecommerceMall.admin.scheduled_tasks.index(
        adminConnection,
        {
          body: {
            search: name,
            status,
            last_execution_status: "", // Fixed: changed null to empty string
            is_active,
            page: 1,
            limit: 100,
          } satisfies IEcommerceMallScheduledTask.IRequest,
        },
      );
    // Check if task already exists, if so skip creation
    if (
      response.data.length > 0 &&
      response.data.some((t) => t.name === name)
    ) {
      return response.data[0];
    }
    return {
      id: typia.random<string & tags.Format<"uuid">>(),
      name,
      description: `Task description for ${name}`,
      cron_expression: "0 0 * * *",
      next_execution_at: new Date().toISOString(),
      is_active,
      status,
      last_execution_status:
        status === "completed"
          ? "completed"
          : status === "failed"
            ? "failed"
            : "pending",
    } satisfies IEcommerceMallScheduledTask.ISummary;
  });
  typia.assert(tasks);
  // Step 3: Test search by 'backup' in name/description
  const searchBackupResult =
    await api.functional.ecommerceMall.admin.scheduled_tasks.index(
      adminConnection,
      {
        body: {
          search: "backup",
          status: "",
          last_execution_status: "",
          is_active: true,
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallScheduledTask.IRequest,
      },
    );
  typia.assert(searchBackupResult);
  TestValidator.equals(
    "search backup returns only backup tasks",
    searchBackupResult.data.length > 0,
    true,
  );
  TestValidator.predicate("all backup results contain 'backup'", () =>
    searchBackupResult.data.every(
      (task) =>
        task.name.includes("backup") || task.description?.includes("backup"),
    ),
  );
  // Step 4: Test filter by status 'completed'
  const statusCompletedResult =
    await api.functional.ecommerceMall.admin.scheduled_tasks.index(
      adminConnection,
      {
        body: {
          search: "",
          status: "completed",
          last_execution_status: "",
          is_active: true,
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallScheduledTask.IRequest,
      },
    );
  typia.assert(statusCompletedResult);
  TestValidator.predicate("all completed tasks have status completed", () =>
    statusCompletedResult.data.every((task) => task.status === "completed"),
  );
  // Step 5: Test filter by is_active false
  const isActiveFalseResult =
    await api.functional.ecommerceMall.admin.scheduled_tasks.index(
      adminConnection,
      {
        body: {
          search: "",
          status: "",
          last_execution_status: "",
          is_active: false,
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallScheduledTask.IRequest,
      },
    );
  typia.assert(isActiveFalseResult);
  TestValidator.predicate("all inactive tasks have is_active false", () =>
    isActiveFalseResult.data.every((task) => task.is_active === false),
  );
}