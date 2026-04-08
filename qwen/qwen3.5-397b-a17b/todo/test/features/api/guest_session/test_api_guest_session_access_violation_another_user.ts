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

/**
 * Test guest session data isolation by verifying a guest cannot access another guest's session details.
 *
 * Validates the privacy boundary that each guest's session information is private and inaccessible to other guests. Creates two separate guest accounts with different device fingerprints, then attempts to have the first guest retrieve session details using the second guest's session ID.
 *
 * The test ensures that the system enforces data isolation at the session level, preventing unauthorized access to another user's session metadata including IP address, page href, referrer, and session timestamps.
 *
 * 1. Create first guest account with unique device fingerprint and capture authentication tokens.
 * 2. Create second guest account with different device fingerprint and capture session information.
 * 3. Attempt to access second guest's session using first guest's authenticated connection.
 * 4. Verify the system rejects the request with appropriate HTTP error (403 Forbidden or 404 Not Found).
 */
export async function test_api_guest_session_access_violation_another_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first guest account
  const guest1Connection: api.IConnection = { host: connection.host };
  const guest1 = await authorize_guest_join(guest1Connection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppGuest.IJoin,
  });
  typia.assert(guest1);
  // 2. Create second guest account with different fingerprint
  const guest2Connection: api.IConnection = { host: connection.host };
  const guest2 = await authorize_guest_join(guest2Connection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppGuest.IJoin,
  });
  typia.assert(guest2);
  // 3. Attempt to access guest2's session using guest1's connection (should fail)
  // The session ID is associated with the guest account created during join
  // Using guest2.id as the session identifier to test cross-guest access violation
  await TestValidator.httpError(
    "guest cannot access another guest's session",
    [403, 404],
    async () => {
      await api.functional.todoApp.guest.sessions.at(guest1Connection, {
        sessionId: guest2.id,
      });
    },
  );
}
