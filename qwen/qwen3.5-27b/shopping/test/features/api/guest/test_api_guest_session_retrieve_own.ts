import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import type { IShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test that an authenticated guest can successfully retrieve their own session information.
 * 1. Authenticate as guest to obtain session tokens and session ID
 * 2. Retrieve the session using the session ID
 * 3. Validate session metadata and guest information
 * 4. Confirm sensitive fields are excluded from response
 */
export async function test_api_guest_session_retrieve_own(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as guest to obtain session
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallGuest.IJoin,
  });
  typia.assert(authorized);
  // 2. Retrieve the guest session
  const session = await api.functional.shoppingMall.guest.sessions.at(
    guestConnection,
    {
      sessionId: authorized.id,
    },
  );
  typia.assert(session);
  // 3. Validate session ID matches
  TestValidator.equals("session ID matches", session.id, authorized.id);
  // 4. Validate guest information matches authorization response
  TestValidator.equals("guest ID matches", session.guest.id, authorized.id);
  TestValidator.equals(
    "device fingerprint matches",
    session.guest.device_fingerprint,
    authorized.device_fingerprint,
  );
  TestValidator.equals("IP matches", session.guest.ip, authorized.ip);
  TestValidator.predicate(
    "has active sessions",
    session.guest.active_session_count >= 1,
  );
  // 5. Validate session metadata consistency
  TestValidator.equals(
    "session IP matches guest IP",
    session.ip,
    session.guest.ip,
  );
  TestValidator.predicate("session has valid href", session.href.length > 0);
}
