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

export async function test_api_user_session_complex_filtering_date_ip_search(
  connection: api.IConnection,
): Promise<void> {
  // Create user account
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);
  // Note: Sessions are automatically created during authentication
  // The user join operation creates the first session
  // Additional sessions would need to be created via login/logout cycles
  // For this test, we'll work with the existing session from join
  // Test combined filtering with the current session
  const currentDate = new Date();
  const fromDate = new Date(
    currentDate.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const toDate = new Date(
    currentDate.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  // Get current session IP from the connection (if available) or use a test IP
  const testIP = "127.0.0.1" satisfies string & tags.Format<"ipv4">;
  const searchTerm = "example"; // Common term that should match the session
  const filteredSessions = await api.functional.todoApp.user.sessions.index(
    userConnection,
    {
      body: {
        from_date: fromDate satisfies string & tags.Format<"date-time">,
        to_date: toDate satisfies string & tags.Format<"date-time">,
        ip: testIP,
        search: searchTerm,
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies ITodoAppUserSession.IRequest,
    },
  );
  typia.assert(filteredSessions);
  // Validate filtering results
  TestValidator.equals(
    "pagination limit",
    filteredSessions.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination page",
    filteredSessions.pagination.current,
    1,
  );
  // Should have at least the current session
  TestValidator.predicate("has sessions", filteredSessions.data.length >= 1);
  if (filteredSessions.data.length > 0) {
    const session = filteredSessions.data[0];
    // Validate date range inclusion
    const sessionDate = new Date(session.created_at);
    const fromDateObj = new Date(fromDate);
    const toDateObj = new Date(toDate);
    TestValidator.predicate(
      "session within from_date range",
      sessionDate >= fromDateObj,
    );
    TestValidator.predicate(
      "session within to_date range",
      sessionDate <= toDateObj,
    );
    // Validate user association
    TestValidator.equals(
      "session belongs to correct user",
      session.user.id,
      user.id,
    );
  }
}
