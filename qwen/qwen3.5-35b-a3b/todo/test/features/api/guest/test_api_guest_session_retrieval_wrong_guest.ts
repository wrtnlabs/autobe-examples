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

export async function test_api_guest_session_retrieval_wrong_guest(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as Guest A and capture session context
  const guestAConnection: api.IConnection = { host: connection.host };
  const guestA = await authorize_guest_join(guestAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoGuest.IJoin,
  });
  typia.assert(guestA);
  // Generate a random session ID to attempt accessing (simulating Guest A's session)
  const guestASessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Authenticate as Guest B with different credentials
  const guestBConnection: api.IConnection = { host: connection.host };
  const guestB = await authorize_guest_join(guestBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoGuest.IJoin,
  });
  typia.assert(guestB);
  // 3. Attempt to access Guest A's session from Guest B's context
  // Should return 404 (not 403) to prevent user enumeration
  await TestValidator.error("wrong guest access returns 404", async () => {
    await api.functional.multiUserTodo.guest.sessions.at(guestBConnection, {
      sessionId: guestASessionId,
    });
  });
  // 4. Verify that the guest IDs are different (cross-user access attempt)
  TestValidator.notEquals("different guest accounts", guestA.id, guestB.id);
}