import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingActivityLog";
import type { IHrmTimeTrackingManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingManager";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingActivityLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_manager_join } from "../../../authorize/authorize_manager_join";
import { authorize_manager_login } from "../../../authorize/authorize_manager_login";
import { authorize_manager_refresh } from "../../../authorize/authorize_manager_refresh";

export async function test_api_activity_log_search_filtered_organization_scope(
  connection: api.IConnection,
): Promise<void> {
  const managerConnection: api.IConnection = { host: connection.host };
  const managerEmail = typia.random<string & tags.Format<"email">>();
  const managerPassword = RandomGenerator.alphaNumeric(16);
  const managerHref = typia.random<string & tags.Format<"uri">>();
  const managerReferrer = typia.random<string & tags.Format<"uri">>();
  const managerIp = typia.random<string & tags.Format<"ipv4">>();
  const authorized = await authorize_manager_join(managerConnection, {
    body: {
      email: managerEmail,
      password: managerPassword,
      href: managerHref,
      referrer: managerReferrer,
      ip: managerIp,
    },
  });
  typia.assert(authorized);
  TestValidator.equals(
    "joined manager email matches input",
    authorized.email,
    managerEmail,
  );
  const now = new Date();
  const startCreatedAt = new Date(
    now.getTime() - 1000 * 60 * 60 * 24 * 30,
  ).toISOString();
  const endCreatedAt = new Date(now.getTime() + 1000 * 60 * 5).toISOString();
  const actorType = "manager";
  const actionType = RandomGenerator.pick([
    "create",
    "update",
    "delete",
    "approve",
    "reject",
  ] as const);
  const targetEntity = RandomGenerator.pick([
    "employee",
    "project",
    "task",
    "timesheet",
    "role",
    "contract",
  ] as const);
  const searchKeyword = RandomGenerator.alphabets(12);
  const page = 1 satisfies number as number;
  const limit = 10 satisfies number as number;
  const request = {
    actorType,
    actionType,
    targetEntity,
    search: searchKeyword,
    startCreatedAt,
    endCreatedAt,
    page,
    limit,
  } satisfies IHrmTimeTrackingActivityLog.IRequest;
  const result =
    await api.functional.hrmTimeTracking.manager.activityLogs.search(
      managerConnection,
      {
        body: request,
      },
    );
  typia.assert(result);
  TestValidator.equals(
    "pagination current matches request",
    result.pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination limit matches request",
    result.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "returned rows fit limit",
    result.data.length <= limit,
  );
  TestValidator.predicate(
    "records cover returned rows",
    result.pagination.records >= result.data.length,
  );
  TestValidator.predicate(
    "pages is non-negative",
    result.pagination.pages >= 0,
  );
  for (const row of result.data) {
    TestValidator.equals(
      "row actor type matches filter",
      row.actor_type,
      actorType,
    );
    TestValidator.equals(
      "row action type matches filter",
      row.action_type,
      actionType,
    );
    TestValidator.equals(
      "row target entity matches filter",
      row.target_entity,
      targetEntity,
    );
    TestValidator.predicate(
      "row created_at is within requested start range",
      new Date(row.created_at).getTime() >= new Date(startCreatedAt).getTime(),
    );
    TestValidator.predicate(
      "row created_at is within requested end range",
      new Date(row.created_at).getTime() <= new Date(endCreatedAt).getTime(),
    );
    if (row.details !== null) {
      TestValidator.predicate(
        "row details contain search keyword",
        row.details.toLowerCase().includes(searchKeyword.toLowerCase()),
      );
    }
  }
  for (let i = 1; i < result.data.length; ++i) {
    const previous = result.data[i - 1];
    const current = result.data[i];
    const previousTime = new Date(previous.created_at).getTime();
    const currentTime = new Date(current.created_at).getTime();
    TestValidator.predicate(
      "activity log rows are ordered newest first",
      previousTime >= currentTime,
    );
  }
  const randomKeyword = RandomGenerator.alphaNumeric(24);
  const randomKeywordResult =
    await api.functional.hrmTimeTracking.manager.activityLogs.search(
      managerConnection,
      {
        body: {
          actorType,
          targetEntity,
          search: randomKeyword,
          page,
          limit,
        } satisfies IHrmTimeTrackingActivityLog.IRequest,
      },
    );
  typia.assert(randomKeywordResult);
  TestValidator.equals(
    "random keyword search pagination current matches request",
    randomKeywordResult.pagination.current,
    page,
  );
  TestValidator.equals(
    "random keyword search pagination limit matches request",
    randomKeywordResult.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "random keyword search rows fit limit",
    randomKeywordResult.data.length <= limit,
  );
  for (const row of randomKeywordResult.data) {
    TestValidator.equals(
      "random keyword search row actor type matches filter",
      row.actor_type,
      actorType,
    );
    TestValidator.equals(
      "random keyword search row target entity matches filter",
      row.target_entity,
      targetEntity,
    );
    if (row.details !== null) {
      TestValidator.predicate(
        "random keyword search row details contain keyword when returned",
        row.details.toLowerCase().includes(randomKeyword.toLowerCase()),
      );
    }
  }
}
