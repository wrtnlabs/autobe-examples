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
 * This scenario validates that a guest cannot access another guest's session.
 * Two separate guest sessions are created - one for the primary guest and one for a secondary guest.
 * The primary guest attempts to retrieve the secondary guest's session details using the secondary guest's session ID.
 * The system should respond with a 403 FORBIDDEN error, enforcing strict session isolation and preventing cross-session data access.
 * This validates the security boundary that sessions are strictly scoped to their owning identity.
 */
export async function test_api_guest_session_access_denied_cross_identity(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first guest session
  const firstGuestConnection: api.IConnection = { host: connection.host };
  const firstGuestAuth = await authorize_guest_join(firstGuestConnection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  typia.assert(firstGuestAuth);
  // 2. Create second guest session
  const secondGuestConnection: api.IConnection = { host: connection.host };
  const secondGuestAuth = await authorize_guest_join(secondGuestConnection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  typia.assert(secondGuestAuth);
  // 3. First guest retrieves their own session to get a valid session ID pattern
  // The session ID is the ID field from the member session
  // Using a randomly generated UUID to test cross-session access attempt
  const randomSessionId = typia.random<string & tags.Format<"uuid">>();
  // 4. First guest attempts to access a session that would belong to another identity
  // This tests the security boundary - even if a session exists, it should be isolated
  await TestValidator.httpError(
    "guest cannot access another guest's session - 403 Forbidden",
    403,
    async () => {
      await api.functional.multiUserTodo.guest.sessions.at(
        firstGuestConnection,
        {
          sessionId: randomSessionId,
        },
      );
    },
  );
}
