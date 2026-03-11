import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIScheduledTodoActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIScheduledTodoActivity";
import type { IScheduledTodoActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IScheduledTodoActivity";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_todo_analytics_default_settings(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: (typia.random<string & tags.Format<"email">>() satisfies string as string) as string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">,
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberSession.IJoin;
  const joined = await authorize_member_join(memberConnection, {
    body: joinInput,
  });
  typia.assert(joined);
  // 2. Call analytics endpoint with default settings (no filters, default pagination)
  const requestBody = {
    status: "all",
    sortField: "createdAt",
    sortOrder: "desc",
    offset: 0,
    limit: 10,
  } satisfies IScheduledTodoActivity.IRequest;
  const result = await api.functional.todoApp.member.analytics.activities.index(
    memberConnection,
    { body: requestBody },
  );
  typia.assert(result);
  // 3. Validate response structure
  TestValidator.predicate(
    "has pagination data",
    result.pagination !== undefined,
  );
  TestValidator.predicate("has data array", result.data !== undefined);
  // 4. Validate pagination structure
  TestValidator.predicate(
    "current page is valid",
    result.pagination.current >= 0,
  );
  TestValidator.predicate("limit is valid", result.pagination.limit >= 0);
  TestValidator.predicate(
    "records count is valid",
    result.pagination.records >= 0,
  );
  TestValidator.predicate("pages count is valid", result.pagination.pages >= 0);
  // 5. Validate activity summaries structure
  for (const summary of result.data) {
    TestValidator.predicate(
      "activity type is valid",
      ["created", "completed", "edited"].includes(summary.activity_type),
    );
    TestValidator.predicate(
      "timestamp is valid",
      summary.timestamp !== undefined,
    );
    TestValidator.predicate("count is non-negative", summary.count >= 0);
  }
}