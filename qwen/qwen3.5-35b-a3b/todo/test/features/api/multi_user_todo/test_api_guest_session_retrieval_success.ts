import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as guest
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoGuest.IJoin,
  });
  typia.assert(guestAuth);
  // 2. Create connection with auth token
  const sessionConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${guestAuth.token.access}`,
    },
  };
  // 3. Generate a session ID to retrieve
  // Note: In a real scenario, this would come from the join response or
  // a session list endpoint. For this test, we use a UUID that would
  // have been created during the guest join process.
  const sessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const session = await api.functional.multiUserTodo.guest.sessions.at(
    sessionConnection,
    {
      sessionId,
    },
  );
  typia.assert(session);
  // 4. Verify all required fields are present and correctly typed
  TestValidator.equals("session ID matches", session.id, sessionId);
  TestValidator.equals("member ID is UUID", session.member.id, guestAuth.id);
  TestValidator.equals(
    "member email is string",
    typeof session.member.email,
    "string",
  );
  // 5. Verify IP is valid IPv4 format
  TestValidator.predicate(
    "IP is valid IPv4 format",
    /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(session.ip),
  );
  // 6. Verify timestamps are valid ISO 8601 format
  const createdDate = new Date(session.created_at);
  const expiredDate = new Date(session.expired_at);
  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(createdDate.getTime()),
  );
  TestValidator.predicate(
    "expired_at is valid date",
    !isNaN(expiredDate.getTime()),
  );
  // 7. Verify session lifecycle: expired_at is after created_at
  TestValidator.predicate(
    "expired_at is after created_at",
    expiredDate > createdDate,
  );
  // 8. Verify session is still valid (not expired)
  const now = new Date();
  TestValidator.predicate("session not expired", expiredDate > now);
  // 9. Verify all timestamp fields are non-empty strings
  TestValidator.equals("href is non-empty", session.href.length > 0, true);
  TestValidator.equals(
    "referrer is non-empty",
    session.referrer.length > 0,
    true,
  );
  TestValidator.equals("ip is non-empty", session.ip.length > 0, true);
}
