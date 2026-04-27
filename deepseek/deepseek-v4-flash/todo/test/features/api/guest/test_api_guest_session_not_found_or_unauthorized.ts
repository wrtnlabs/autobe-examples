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

export async function test_api_guest_session_not_found_or_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  //----
  // Prepare guest 1
  //----
  const guest1Connection: api.IConnection = { host: connection.host };
  const guest1Auth = await authorize_guest_join(guest1Connection, {});
  typia.assert(guest1Auth);
  //----
  // Test 1: Non-existent session ID returns 404
  //----
  await TestValidator.httpError("non-existent session id", 404, async () => {
    await api.functional.todoApp.guest.sessions.at(guest1Connection, {
      sessionId: typia.random<string & tags.Format<"uuid">>(),
    });
  });
  //----
  // Prepare guest 2 and capture its session ID (refresh token)
  //----
  const guest2Connection: api.IConnection = { host: connection.host };
  const guest2Auth = await authorize_guest_join(guest2Connection, {});
  typia.assert(guest2Auth);
  const guest2SessionId = guest2Auth.token.refresh as string &
    tags.Format<"uuid">;
  //----
  // Test 2: Guest 1 cannot access guest 2's session (same 404)
  //----
  await TestValidator.httpError("other guest's session id", 404, async () => {
    await api.functional.todoApp.guest.sessions.at(guest1Connection, {
      sessionId: guest2SessionId,
    });
  });
}
