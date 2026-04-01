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
 * Test that a guest cannot access another guest's session information, enforcing session privacy boundaries.
 *
 * This test validates that:
 * 1. Guest A cannot retrieve Guest B's session information
 * 2. Session data is properly isolated between different guest accounts
 * 3. Authorization errors are returned when attempting cross-user session access
 */
export async function test_api_guest_session_privacy_violation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Guest A with unique device fingerprint
  const guestAConnection: api.IConnection = { host: connection.host };
  const guestADeviceFingerprint = RandomGenerator.alphaNumeric(32);
  const guestAResult = await authorize_guest_join(guestAConnection, {
    body: {
      device_fingerprint: guestADeviceFingerprint,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoGuest.IJoin,
  });
  typia.assert(guestAResult);
  // 2. Register Guest B with different device fingerprint
  const guestBConnection: api.IConnection = { host: connection.host };
  const guestBDeviceFingerprint = RandomGenerator.alphaNumeric(32);
  const guestBResult = await authorize_guest_join(guestBConnection, {
    body: {
      device_fingerprint: guestBDeviceFingerprint,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoGuest.IJoin,
  });
  typia.assert(guestBResult);
  // Verify guests have different IDs
  TestValidator.notEquals(
    "Guest A and Guest B should have different IDs",
    guestAResult.id,
    guestBResult.id,
  );
  // 3. Attempt to access Guest B's session using Guest A's credentials
  // This should fail with authorization error (403 or 404)
  await TestValidator.httpError(
    "Guest A should not be able to access Guest B's session",
    [403, 404],
    async () => {
      await api.functional.multiUserTodo.guest.sessions.at(guestAConnection, {
        sessionId: guestBResult.id,
      });
    },
  );
}
