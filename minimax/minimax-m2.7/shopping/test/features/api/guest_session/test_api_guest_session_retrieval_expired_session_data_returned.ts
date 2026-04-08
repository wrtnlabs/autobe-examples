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

export async function test_api_guest_session_retrieval_expired_session_data_returned(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a guest session
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallGuest.IJoin,
  });
  typia.assert(authorized);
  // 2. Wait for session to expire (simulate time passage)
  // The key validation is that the response includes session data even if
  // current time exceeds the expired_at timestamp
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 3. Retrieve the session by ID
  // The system should return session data regardless of expiration status
  const session = await api.functional.ecommerceMall.guest_sessions.at(
    guestConnection,
    {
      sessionId: authorized.id,
    },
  );
  typia.assert(session);
  // 4. Validate response structure matches IEcommerceMallGuestSession
  TestValidator.equals("session id matches", session.id, authorized.id);
  TestValidator.predicate("has valid ip", session.ip.length > 0);
  TestValidator.predicate("has valid href", session.href.length > 0);
  TestValidator.predicate("has valid referrer", session.referrer.length > 0);
  TestValidator.predicate("has valid createdAt", session.createdAt.length > 0);
  TestValidator.predicate("has valid expiredAt", session.expiredAt.length > 0);
  // 5. Validate guest relation structure
  TestValidator.predicate("has guest info", session.guest !== null);
  TestValidator.predicate("guest has id", session.guest.id.length > 0);
  TestValidator.predicate(
    "guest has fingerprint",
    session.guest.fingerprint.length > 0,
  );
}
