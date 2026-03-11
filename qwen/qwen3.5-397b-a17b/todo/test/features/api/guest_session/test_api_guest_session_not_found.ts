import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import type { ITodoAppGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestSession";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test that a guest receives appropriate error response when attempting to retrieve a non-existent session.
 *
 * Test Flow:
 * 1. Guest authenticates via POST /todoApp/auth/guest/join to establish session
 * 2. Guest attempts to retrieve session with a randomly generated UUID that doesn't exist
 * 3. System should return 404 Not Found error
 *
 * This validates proper error handling for invalid session references and ensures
 * the system doesn't leak information about session existence beyond the error code.
 */
export async function test_api_guest_session_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest authentication - establish session
  const guestConnection: api.IConnection = { host: connection.host };
  const guest = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppGuest.IJoin,
  });
  typia.assert(guest);
  // 2. Attempt to retrieve non-existent session with random UUID
  const nonExistentSessionId = typia.random<string & tags.Format<"uuid">>();
  // 3. Validate that system returns 404 Not Found for non-existent session
  await TestValidator.httpError(
    "non-existent session returns 404",
    404,
    async () => {
      await api.functional.todoApp.guest.sessions.at(guestConnection, {
        sessionId: nonExistentSessionId,
      });
    },
  );
}
