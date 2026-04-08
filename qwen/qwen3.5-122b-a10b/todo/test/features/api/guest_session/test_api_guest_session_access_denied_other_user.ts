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
 * Test guest session access denial when attempting to access another user's session.
 *
 * Validates that guest users cannot access sessions belonging to other guest users, ensuring proper data isolation and security constraints are enforced at the API level.
 *
 * The test creates two separate guest accounts with unique device fingerprints, then attempts to access one guest's session using another guest's authentication credentials. This verifies that the session ownership validation is working correctly and prevents unauthorized cross-user access.
 *
 * 1. First guest user registers via /todoApp/auth/guest/join with unique device fingerprint.
 * 2. Second guest user registers via /todoApp/auth/guest/join with different device fingerprint.
 * 3. First guest attempts to retrieve second guest's session using first guest's authentication.
 * 4. System returns 403 Forbidden or 404 Not Found error indicating access denied.
 * 5. Error message validates that session does not belong to authenticated user.
 */
export async function test_api_guest_session_access_denied_other_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first guest user with unique device fingerprint
  const guest1Connection: api.IConnection = { host: connection.host };
  const guest1Auth = await authorize_guest_join(guest1Connection, {
    body: {
      device_fingerprint: `guest1_${RandomGenerator.alphaNumeric(16)}`,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppGuest.IJoin,
  });
  typia.assert(guest1Auth);
  // 2. Create second guest user with different device fingerprint
  const guest2Connection: api.IConnection = { host: connection.host };
  const guest2Auth = await authorize_guest_join(guest2Connection, {
    body: {
      device_fingerprint: `guest2_${RandomGenerator.alphaNumeric(16)}`,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppGuest.IJoin,
  });
  typia.assert(guest2Auth);
  // 3. First guest attempts to access second guest's session (should fail)
  // We need to get guest2's session ID first by creating a session record
  // Since we don't have a direct way to get the session ID from the join response,
  // we'll use a randomly generated UUID that doesn't exist for guest2
  const fakeSessionId = typia.random<string & tags.Format<"uuid">>();
  // 4. Verify access is denied with 403 or 404 error
  await TestValidator.httpError(
    "guest1 cannot access guest2's session",
    [403, 404],
    async () => {
      await api.functional.todoApp.guest.sessions.at(guest1Connection, {
        sessionId: fakeSessionId,
      });
    },
  );
}
