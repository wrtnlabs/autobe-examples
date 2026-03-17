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
 * Validates error handling when attempting to retrieve a session that does not exist.
 * A guest first authenticates to obtain a valid session. Then, the guest attempts to
 * retrieve session details using a randomly generated UUID that does not correspond
 * to any existing session. The system should respond with a 404 NOT FOUND error.
 */
export async function test_api_guest_session_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create guest-specific connection
  const guestConnection: api.IConnection = { host: connection.host };
  // Authenticate as guest to obtain valid credentials
  await authorize_guest_join(guestConnection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // Generate a random UUID that doesn't correspond to any existing session
  const nonExistentSessionId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve non-existent session - should throw 404 error
  await TestValidator.httpError(
    "non-existent session returns 404",
    404,
    async () => {
      await api.functional.multiUserTodo.guest.sessions.at(guestConnection, {
        sessionId: nonExistentSessionId,
      });
    },
  );
}
