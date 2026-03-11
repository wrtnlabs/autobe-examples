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

export async function test_api_scheduled_task_list_retrieval_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Call search endpoint with pagination parameters
  const result = await api.functional.ecommerceMall.admin.scheduled_tasks.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
        search: "",
        status: "",
        last_execution_status: "",
        is_active: true,
      } satisfies IEcommerceMallScheduledTask.IRequest,
    },
  );
  // 3. Validate response structure
  typia.assert(result);
  // 4. Verify pagination metadata
  TestValidator.equals(
    "pagination has correct current",
    result.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination has correct limit",
    result.pagination.limit,
    10,
  );
  TestValidator.predicate("has records", result.pagination.records >= 0);
  TestValidator.predicate("pages is valid", result.pagination.pages >= 0);
  // 5. Verify task summary structure
  TestValidator.predicate("has task data", result.data.length >= 0);
  result.data.forEach((task: IEcommerceMallScheduledTask.ISummary) => {
    // Validate task has required fields
    TestValidator.predicate("has id", typeof task.id === "string");
    TestValidator.predicate("has name", typeof task.name === "string");
    TestValidator.predicate(
      "has cron_expression",
      typeof task.cron_expression === "string",
    );
    TestValidator.predicate(
      "has next_execution_at",
      typeof task.next_execution_at === "string",
    );
    TestValidator.predicate(
      "has is_active",
      typeof task.is_active === "boolean",
    );
    TestValidator.predicate("has status", typeof task.status === "string");
    TestValidator.predicate(
      "has last_execution_status",
      task.last_execution_status === null ||
        typeof task.last_execution_status === "string",
    );
  });
}
