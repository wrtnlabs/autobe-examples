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

/**
 * Test retrieving a guest session by a valid session ID.
 *
 * Validates the guest session retrieval endpoint by first creating a guest session
 * with device fingerprint information, then retrieving that session using its
 * unique identifier. The test verifies that all session metadata is correctly
 * returned including IP address, navigation context (href, referrer), timestamps,
 * and the nested guest object containing device identification.
 *
 * 1. Create a guest session with fingerprint, href, and referrer using the join endpoint.
 * 2. Extract the session ID from the authorization response.
 * 3. Call the session retrieval endpoint with the created session ID.
 * 4. Validate the response contains matching session ID and all required session metadata.
 * 5. Verify the nested guest object contains fingerprint and device information.
 * 6. Confirm the session has not expired based on the current time.
 */
export async function test_api_guest_session_retrieval_with_valid_session_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a guest session using the utility function
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized: IEcommerceMallGuest.IAuthorized =
    await authorize_guest_join(guestConnection, {});
  // 2. Extract the session ID from authorization response
  const sessionId: string & tags.Format<"uuid"> = authorized.id;
  // 3. Retrieve the guest session by session ID
  const session: IEcommerceMallGuestSession =
    await api.functional.ecommerceMall.guest.guest.sessions.at(
      guestConnection,
      {
        sessionId: sessionId,
      },
    );
  typia.assert(session);
  // 4. Validate session ID matches
  TestValidator.equals("session ID matches", session.id, sessionId);
  // 5. Validate IP address is recorded
  TestValidator.predicate(
    "IP address exists",
    session.ip !== null && session.ip !== undefined,
  );
  // 6. Validate navigation context
  TestValidator.predicate(
    "href is non-empty string",
    typeof session.href === "string" && session.href.length > 0,
  );
  TestValidator.predicate(
    "referrer is non-empty string",
    typeof session.referrer === "string" && session.referrer.length > 0,
  );
  // 7. Validate timestamps
  TestValidator.predicate(
    "createdAt is valid ISO datetime",
    !isNaN(Date.parse(session.createdAt)),
  );
  TestValidator.predicate(
    "expiredAt is valid ISO datetime",
    !isNaN(Date.parse(session.expiredAt)),
  );
  // 8. Verify session is not expired
  const now: Date = new Date();
  const expiredAt: Date = new Date(session.expiredAt);
  TestValidator.predicate("session not expired", expiredAt > now);
  // 9. Validate nested guest object
  TestValidator.predicate(
    "guest exists",
    session.guest !== null && session.guest !== undefined,
  );
  TestValidator.predicate(
    "guest fingerprint exists",
    typeof session.guest.fingerprint === "string" &&
      session.guest.fingerprint.length > 0,
  );
}