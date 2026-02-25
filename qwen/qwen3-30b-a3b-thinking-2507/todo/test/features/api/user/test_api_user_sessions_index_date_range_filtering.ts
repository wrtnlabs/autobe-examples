import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppUserSession";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_sessions_index_date_range_filtering(
  connection: api.IConnection,
) {
  // Register new user via utility function
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234",
    } satisfies ITodoAppUser.IJoin,
  });
  // Define test date range (ISO 8601 standard)
  const created_at_after = "2024-01-01T00:00:00Z";
  const created_at_before = "2024-01-02T00:00:00Z";
  // Test sessions within date range
  const response = await api.functional.todoApp.user.sessions.index(
    userConnection,
    {
      body: {
        created_at_after,
        created_at_before,
      } satisfies ITodoAppUserSession.IRequest,
    },
  );
  typia.assert(response);
  // Verify all sessions are within expected date range
  TestValidator.predicate(
    "all sessions should have created_at within date range",
    response.data.every(
      (session) =>
        session.created_at >= created_at_after &&
        session.created_at < created_at_before,
    ),
  );
  // Edge case test with overlapping dates (no sessions)
  const overlappingResponse = await api.functional.todoApp.user.sessions.index(
    userConnection,
    {
      body: {
        created_at_after: "2024-01-01T00:00:00Z",
        created_at_before: "2024-01-01T00:00:00Z",
      } satisfies ITodoAppUserSession.IRequest,
    },
  );
  typia.assert(overlappingResponse);
  TestValidator.equals(
    "overlapping date filters should return empty results",
    overlappingResponse.data.length,
    0,
  );
}
