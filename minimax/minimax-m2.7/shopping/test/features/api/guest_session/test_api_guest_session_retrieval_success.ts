import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import type { IEcommerceMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuestSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new guest session using the authorize utility function
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {});
  // 2. Retrieve the guest session using the guest's ID as the session ID
  const session = await api.functional.ecommerceMall.guest.sessions.at(
    guestConnection,
    {
      sessionId: authorized.id,
    },
  );
  typia.assert(session);
  // 3. Validate session has required fields
  TestValidator.equals("session has id", session.id, authorized.id);
  TestValidator.equals("session has ip", !!session.ip, true);
  TestValidator.equals("session has href", !!session.href, true);
  TestValidator.equals("session has referrer", !!session.referrer, true);
  TestValidator.equals("session has created_at", !!session.created_at, true);
  TestValidator.equals("session has expired_at", !!session.expired_at, true);
  // 4. Validate nested guest object
  TestValidator.equals(
    "guest has fingerprint",
    !!session.guest.fingerprint,
    true,
  );
  TestValidator.equals(
    "guest has last_active_at",
    !!session.guest.last_active_at,
    true,
  );
  // 5. Validate session is within validity period (expired_at > current timestamp)
  const now = new Date().toISOString();
  TestValidator.predicate("session not expired", session.expired_at > now);
}
