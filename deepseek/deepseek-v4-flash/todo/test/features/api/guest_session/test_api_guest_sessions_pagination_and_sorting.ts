import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberSession";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_sessions_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as guest to obtain authentication tokens
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. List sessions with page=1, limit=2, sort='-created_at' (newest first)
  const page1Newest = await api.functional.todoApp.guest.sessions.index(
    guestConnection,
    {
      body: {
        page: 1,
        limit: 2,
        sort: "-created_at",
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(page1Newest);
  // 3. Verify pagination metadata
  TestValidator.equals("current page", page1Newest.pagination.current, 1);
  TestValidator.equals("page limit", page1Newest.pagination.limit, 2);
  TestValidator.predicate(
    "total records >= 0",
    page1Newest.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages >= 0",
    page1Newest.pagination.pages >= 0,
  );
  // 4. Verify data array has at most 2 items (honoring limit)
  TestValidator.predicate("data length <= limit", page1Newest.data.length <= 2);
  // 5. Change sort to 'created_at' (oldest first) and call again
  const page1Oldest = await api.functional.todoApp.guest.sessions.index(
    guestConnection,
    {
      body: {
        page: 1,
        limit: 2,
        sort: "created_at",
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(page1Oldest);
  // 6. Verify sessions are ordered by created_at ascending (oldest first)
  for (let i = 1; i < page1Oldest.data.length; i++) {
    TestValidator.predicate(
      `session[${i - 1}] created_at <= session[${i}] created_at`,
      new Date(page1Oldest.data[i - 1].created_at).getTime() <=
        new Date(page1Oldest.data[i].created_at).getTime(),
    );
  }
  // 7. Navigate to page=2 with limit=2
  const page2 = await api.functional.todoApp.guest.sessions.index(
    guestConnection,
    {
      body: {
        page: 2,
        limit: 2,
        sort: "-created_at",
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(page2);
  // Verify page 2 pagination metadata shows current=2
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 2);
}
