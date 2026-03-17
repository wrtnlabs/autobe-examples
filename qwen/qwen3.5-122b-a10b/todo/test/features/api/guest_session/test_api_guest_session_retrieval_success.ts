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
  // 1. Create guest-specific connection
  const guestConnection: api.IConnection = { host: connection.host };
  // 2. Prepare registration input and store for later validation
  const registrationInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IMultiUserTodoGuest.IJoin;
  // 3. Register guest using utility function
  const authorized = await authorize_guest_join(guestConnection, {
    body: registrationInput,
  });
  typia.assert(authorized);
  // 4. Use guest account ID as session ID (based on scenario requirement)
  const sessionId = authorized.id;
  // 5. Retrieve session details
  const session = await api.functional.multiUserTodo.guest.sessions.at(
    guestConnection,
    {
      sessionId,
    },
  );
  typia.assert(session);
  // 6. Validate session fields match registration context
  TestValidator.equals("session id matches guest id", session.id, sessionId);
  TestValidator.equals(
    "member email matches",
    session.member.email,
    authorized.email,
  );
  TestValidator.equals(
    "member id matches guest id",
    session.member.id,
    authorized.id,
  );
  // 7. Validate session metadata from registration
  TestValidator.equals(
    "IP matches registration",
    session.ip,
    registrationInput.ip ?? "",
  );
  TestValidator.equals(
    "href matches registration",
    session.href,
    registrationInput.href satisfies string as string,
  );
  TestValidator.equals(
    "referrer matches registration",
    session.referrer ?? "",
    registrationInput.referrer,
  );
  // 8. Validate temporal fields exist and are valid
  TestValidator.predicate(
    "created at exists",
    session.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated at exists",
    session.updated_at !== undefined,
  );
  TestValidator.predicate(
    "expired at exists",
    session.expired_at !== undefined,
  );
  // 9. Validate session is active (deleted_at is null)
  TestValidator.equals("session is active", session.deleted_at, null);
  // 10. Validate expired_at is in the future
  const now = new Date();
  const expiredAt = new Date(session.expired_at);
  TestValidator.predicate("session not expired", expiredAt > now);
  // 11. Validate member summary fields
  TestValidator.predicate("member has name", session.member.name.length > 0);
  TestValidator.predicate(
    "member created_at exists",
    session.member.created_at !== undefined,
  );
  TestValidator.predicate(
    "member updated_at exists",
    session.member.updated_at !== undefined,
  );
  TestValidator.equals(
    "member deleted_at is null",
    session.member.deleted_at,
    null,
  );
}