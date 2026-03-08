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

export async function test_api_session_list_single_session(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account and authenticate
  const testHref = "https://example.com/register";
  const testReferrer = "https://example.com/home";
  const testIp = "192.168.1.100";
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: testHref,
      referrer: testReferrer,
      ip: testIp,
    },
  });
  typia.assert(authorized);
  // 2. Retrieve session list
  const sessions = await api.functional.todoApp.guest.sessions.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(sessions);
  // 3. Verify exactly one session exists
  TestValidator.equals("session count", sessions.data.length, 1);
  TestValidator.equals("pagination current", sessions.pagination.current, 1);
  TestValidator.equals("pagination records", sessions.pagination.records, 1);
  TestValidator.equals("pagination pages", sessions.pagination.pages, 1);
  // 4. Verify the single session's metadata
  const session = sessions.data[0];
  typia.assert(session);
  // 5. Verify session timestamps are valid
  const now = new Date();
  const expiredAt = new Date(session.expired_at);
  const createdAt = new Date(session.created_at);
  const updatedAt = new Date(session.updated_at);
  TestValidator.predicate("expired_at is in the future", expiredAt > now);
  TestValidator.predicate("created_at is valid timestamp", createdAt <= now);
  TestValidator.predicate("updated_at is valid timestamp", updatedAt <= now);
  // 6. Verify session metadata from join request
  TestValidator.equals("session href", session.href, testHref);
}
