import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
import type { IMultiUserTodoMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_list_paginated(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest connection and establish session
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoGuest.IJoin,
  });
  // 2. Query sessions with basic pagination (no filters)
  const sessions = await api.functional.multiUserTodo.guest.sessions.index(
    guestConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IMultiUserTodoMemberSession.IRequest,
    },
  );
  typia.assert(sessions);
  // 3. Verify pagination metadata exists and is valid
  TestValidator.predicate(
    "current page is valid",
    sessions.pagination.current >= 1,
  );
  TestValidator.predicate("limit is positive", sessions.pagination.limit > 0);
  TestValidator.predicate(
    "records count non-negative",
    sessions.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count non-negative",
    sessions.pagination.pages >= 0,
  );
  // 4. Verify session data exists
  TestValidator.predicate(
    "session data array exists",
    Array.isArray(sessions.data),
  );
  TestValidator.predicate(
    "at least one session returned",
    sessions.data.length > 0,
  );
  // 5. Verify access token masking (data privacy - full JWT has 3 parts, masked has fewer)
  if (sessions.data.length > 0) {
    const session = sessions.data[0];
    TestValidator.predicate(
      "access token is masked (not full JWT format)",
      session.accessToken.split(".").length < 3 ||
        session.accessToken.endsWith("..."),
    );
  }
}
