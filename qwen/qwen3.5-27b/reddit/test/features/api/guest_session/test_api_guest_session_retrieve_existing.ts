import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
import type { IRedditCloneGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test retrieval of an existing guest session by session ID.
 *
 * Validates the complete guest session retrieval flow including guest registration, session creation, and session detail retrieval. Ensures that the retrieved session contains all expected fields with correct types and that the guest account information is properly included.
 *
 * Special attention is given to verifying that the session data structure matches IRedditCloneGuestSession and that the nested guest object contains proper account details from IRedditCloneGuest.ISummary.
 *
 * 1. Guest registers with device fingerprint and session context.
 * 2. Session ID is extracted from the join response.
 * 3. Guest session is retrieved using the session ID.
 * 4. Validates session details match expected structure and data.
 */
export async function test_api_guest_session_retrieve_existing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest session using utility function
  const guestConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneGuest.IJoin,
  });
  typia.assert(joinResponse);
  // Validate sessions array is not empty
  TestValidator.predicate(
    "sessions array not empty",
    joinResponse.sessions.length > 0,
  );
  // Extract session ID from the join response
  const sessionId = joinResponse.sessions[0].id;
  // 2. Retrieve the guest session using the session ID
  const session = await api.functional.redditClone.guest.guest.sessions.at(
    guestConnection,
    {
      sessionId,
    },
  );
  typia.assert(session);
  // 3. Validate session details
  TestValidator.equals("session ID matches", session.id, sessionId);
  TestValidator.equals("guest ID matches", session.guest.id, joinResponse.id);
  TestValidator.equals(
    "guest device fingerprint matches",
    session.guest.device_fingerprint,
    joinResponse.device_fingerprint,
  );
  TestValidator.predicate(
    "expired_at is after created_at",
    new Date(session.expired_at) > new Date(session.created_at),
  );
}
