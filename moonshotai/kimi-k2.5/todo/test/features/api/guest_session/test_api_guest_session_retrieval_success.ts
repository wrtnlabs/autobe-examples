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

/**
 * Test guest can successfully retrieve their own session details after authentication.
 *
 * Validates the complete session retrieval workflow:
 * 1. Guest obtains authentication via join endpoint
 * 2. Guest retrieves session using their session ID
 * 3. Response contains complete session metadata (id, member, ip, href, referrer, timestamps)
 *
 * @param connection Base connection to derive guest connection from
 */
export async function test_api_guest_session_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Create isolated guest connection
  const guestConnection: api.IConnection = { host: connection.host };
  // Step 1: Guest authentication - creates identity and establishes session
  const joinBody = {
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IMultiUserTodoGuest.IJoin;
  const authorized = await authorize_guest_join(guestConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  // Step 2: Retrieve session details using the session ID (guest ID from token)
  const session = await api.functional.multiUserTodo.guest.sessions.at(
    guestConnection,
    {
      sessionId: authorized.id,
    },
  );
  typia.assert(session);
  // Step 3: Validate session metadata matches join context
  TestValidator.equals(
    "session id matches authorized id",
    session.id,
    authorized.id,
  );
  TestValidator.predicate(
    "session member id matches",
    session.member.id !== undefined && session.member.id === authorized.id,
  );
  TestValidator.equals("href matches input", session.href, joinBody.href);
  TestValidator.equals(
    "referrer matches input",
    session.referrer,
    joinBody.referrer,
  );
}
