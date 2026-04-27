import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_retrieval_expired(
  connection: api.IConnection,
): Promise<void> {
  // Create a dedicated connection for guest operations
  const guestConnection: api.IConnection = { host: connection.host };
  // 1. Join as a guest (uses utility function, modifies connection headers)
  const authorized = await authorize_guest_join(guestConnection, {});
  typia.assert(authorized);
  // 2. The session ID is the refresh token from the authorization response
  const sessionId = authorized.token.refresh as string & tags.Format<"uuid">;
  // 3. Retrieve the session by its ID
  const session = await api.functional.todoApp.guest.sessions.at(
    guestConnection,
    { sessionId },
  );
  typia.assert(session);
  // 4. Business logic validation
  TestValidator.equals(
    "session id matches requested id",
    session.id,
    sessionId,
  );
  TestValidator.predicate(
    "expired_at is after created_at",
    session.expired_at > session.created_at,
  );
}
