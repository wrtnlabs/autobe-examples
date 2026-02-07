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

export async function test_api_user_session_listing_basic_pagination(
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
  // Generate multiple sessions by creating new connections with the same credentials
  // Each new connection will create a new session when accessing authenticated endpoints
  const sessionCount = 5;
  const sessions: api.IConnection[] = [];
  for (let i = 0; i < sessionCount; i++) {
    const sessionConnection: api.IConnection = { host: connection.host };
    // Re-join with same credentials to create new sessions
    await authorize_user_join(sessionConnection, {
      body: {
        email: user.email,
        password: RandomGenerator.alphaNumeric(16), // Use different password for new session
        display_name: user.display_name,
      } satisfies ITodoAppUser.IJoin,
    });
    sessions.push(sessionConnection);
  }
  // Test pagination with page 1 and limit 3
  const page1Response = await api.functional.todoApp.user.sessions.index(
    userConnection,
    {
      body: {
        page: 1,
        limit: 3,
      } satisfies ITodoAppUserSession.IRequest,
    },
  );
  typia.assert(page1Response);
  // Validate pagination metadata
  TestValidator.equals("current page", page1Response.pagination.current, 1);
  TestValidator.equals("limit", page1Response.pagination.limit, 3);
  TestValidator.predicate(
    "records count",
    page1Response.pagination.records >= sessionCount,
  );
  TestValidator.predicate(
    "pages count",
    page1Response.pagination.pages >= Math.ceil(sessionCount / 3),
  );
  // Validate session data structure
  TestValidator.predicate("has data array", Array.isArray(page1Response.data));
  TestValidator.predicate(
    "data length <= limit",
    page1Response.data.length <= 3,
  );
  if (page1Response.data.length > 0) {
    const session = page1Response.data[0];
    TestValidator.predicate("has id", typeof session.id === "string");
    TestValidator.predicate("has ip", typeof session.ip === "string");
    TestValidator.predicate("has href", typeof session.href === "string");
    TestValidator.predicate(
      "has referrer",
      typeof session.referrer === "string",
    );
    TestValidator.predicate(
      "has created_at",
      typeof session.created_at === "string",
    );
    TestValidator.predicate(
      "has expired_at",
      typeof session.expired_at === "string",
    );
    TestValidator.predicate("has user", typeof session.user === "object");
    TestValidator.equals("user id matches", session.user.id, user.id);
    TestValidator.equals("user email matches", session.user.email, user.email);
    TestValidator.equals(
      "user display_name matches",
      session.user.display_name,
      user.display_name,
    );
  }
  // Test pagination with page 2
  const page2Response = await api.functional.todoApp.user.sessions.index(
    userConnection,
    {
      body: {
        page: 2,
        limit: 3,
      } satisfies ITodoAppUserSession.IRequest,
    },
  );
  typia.assert(page2Response);
  TestValidator.equals(
    "page 2 current page",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit", page2Response.pagination.limit, 3);
  TestValidator.equals(
    "total records consistent",
    page2Response.pagination.records,
    page1Response.pagination.records,
  );
  // Verify no overlapping sessions between pages
  if (page1Response.data.length > 0 && page2Response.data.length > 0) {
    const page1Ids = page1Response.data.map((s) => s.id);
    const page2Ids = page2Response.data.map((s) => s.id);
    const overlappingIds = page1Ids.filter((id) => page2Ids.includes(id));
    TestValidator.equals("no overlapping sessions", overlappingIds.length, 0);
  }
}
