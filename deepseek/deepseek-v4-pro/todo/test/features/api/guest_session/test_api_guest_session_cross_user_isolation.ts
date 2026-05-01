import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test cross-user session isolation for guest identities.
 *
 * Validates that a guest user cannot access session details belonging to another guest identity. The system must enforce strict scope isolation — when Guest A attempts to retrieve a session that belongs to Guest B, the endpoint must return a 404 Not Found error without exposing whether the session actually exists.
 *
 * This prevents information leakage where an attacker could probe for session existence by observing different error responses (e.g., 403 vs 404). The endpoint documentation explicitly mandates: "If the session does not exist or belongs to a different member, return a 404 error — do not expose whether the session exists for another user."
 *
 * 1. Guest A joins with a unique device fingerprint, receiving JWT tokens and creating session A.
 * 2. Guest B joins with a different device fingerprint, receiving JWT tokens and creating session B.
 * 3. Guest A attempts to access session details using Guest B's potential session identifier.
 * 4. Verifies the endpoint returns 404 Not Found, confirming cross-user isolation.
 */
export async function test_api_guest_session_cross_user_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Guest A identity with unique fingerprint
  const guestAConnection: api.IConnection = { host: connection.host };
  const guestA = await authorize_guest_join(guestAConnection, {
    body: {
      fingerprint: RandomGenerator.alphaNumeric(64),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(guestA);
  // 2. Create Guest B identity with a different fingerprint
  const guestBConnection: api.IConnection = { host: connection.host };
  const guestB = await authorize_guest_join(guestBConnection, {
    body: {
      fingerprint: RandomGenerator.alphaNumeric(64),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(guestB);
  // 3. Guest A attempts to access a session that belongs to Guest B
  // Use a random UUID as the target session identifier — the system must
  // return 404 without exposing whether the session exists for another guest
  const targetSessionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "Guest A cannot access another guest's session (returns 404 to prevent information leakage)",
    404,
    async () => {
      await api.functional.todoApp.guest.sessions.at(guestAConnection, {
        sessionId: targetSessionId,
      });
    },
  );
}
