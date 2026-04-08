import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmGuest";
import type { IHrmGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test successful retrieval of a valid guest session record.
 *
 * Validates the complete guest session retrieval workflow by creating a guest account through the join endpoint and subsequently retrieving the associated session record. This ensures the session-guest relationship is properly maintained and all session metadata is correctly returned.
 *
 * The test verifies that session retrieval returns complete and accurate information including session identifiers, connection metadata (IP address, entry URL, referrer), lifecycle timestamps (creation and expiration), and the linked guest device information with fingerprint and session count.
 *
 * 1. Create guest account via guest join endpoint with device fingerprint and session context.
 * 2. Extract session ID from the authorization response.
 * 3. Retrieve the session record using the session ID endpoint.
 * 4. Validate session metadata matches the expected values from creation.
 * 5. Validate guest relationship is properly maintained with correct device fingerprint.
 */
export async function test_api_guest_session_retrieval_valid(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest account and get session information
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized: IHrmGuest.IAuthorized = await authorize_guest_join(
    guestConnection,
    {
      body: {
        device_fingerprint: RandomGenerator.alphaNumeric(32),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IHrmGuest.IJoin,
    },
  );
  typia.assert(authorized);
  // 2. Extract session ID from the first session in the response
  const sessionId: string & tags.Format<"uuid"> = authorized.sessions[0].id;
  // 3. Retrieve the session record using the session ID
  const session: IHrmGuestSession =
    await api.functional.hrm.guest.guest.sessions.at(connection, {
      sessionId,
    });
  typia.assert(session);
  // 4. Validate session metadata matches expected values
  TestValidator.equals("session ID matches", session.id, sessionId);
  TestValidator.equals(
    "IP address matches",
    session.ip,
    authorized.sessions[0].ip,
  );
  TestValidator.equals(
    "href matches",
    session.href,
    authorized.sessions[0].href,
  );
  TestValidator.equals(
    "referrer matches",
    session.referrer,
    authorized.sessions[0].referrer,
  );
  TestValidator.equals(
    "created_at matches",
    session.created_at,
    authorized.sessions[0].created_at,
  );
  TestValidator.predicate("expired_at is set", session.expired_at !== null);
  // 5. Validate guest relationship
  TestValidator.equals("guest ID matches", session.guest.id, authorized.id);
  TestValidator.equals(
    "device fingerprint matches",
    session.guest.device_fingerprint,
    authorized.device_fingerprint,
  );
  TestValidator.predicate(
    "sessions_count is positive",
    session.guest.sessions_count > 0,
  );
}
