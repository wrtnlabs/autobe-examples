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

export async function test_api_guest_session_retrieval_with_valid_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a guest session to obtain a valid session ID
  const authorized: IEcommerceMallGuest.IAuthorized =
    await authorize_guest_join(connection, {
      body: {
        fingerprint: "test_fingerprint_12345",
        href: "https://example.com/test-page" as string & tags.Format<"uri">,
        referrer: "https://example.com/" as string & tags.Format<"uri">,
      } satisfies IEcommerceMallGuest.IJoin,
    });
  // Extract the session ID from the authorized response
  const sessionId = authorized.id;
  // 2. Retrieve the guest session using the session ID
  const guestSession = await api.functional.ecommerceMall.guest_sessions.at(
    connection,
    { sessionId },
  );
  // 3. Validate the response structure
  typia.assert(guestSession);
  // 4. Verify session ID matches
  TestValidator.equals(
    "session ID matches requested",
    guestSession.id,
    sessionId,
  );
  // 5. Verify IP address is present
  TestValidator.predicate(
    "IP address is non-empty string",
    typeof guestSession.ip === "string" && guestSession.ip.length > 0,
  );
  // 6. Verify current page URL (href) is present
  TestValidator.predicate(
    "href is non-empty string",
    typeof guestSession.href === "string" && guestSession.href.length > 0,
  );
  // 7. Verify HTTP referrer is present
  TestValidator.predicate(
    "referrer is non-empty string",
    typeof guestSession.referrer === "string" &&
      guestSession.referrer.length > 0,
  );
  // 8. Verify creation timestamp is present
  TestValidator.predicate(
    "createdAt is valid date-time",
    typeof guestSession.createdAt === "string" &&
      !isNaN(Date.parse(guestSession.createdAt)),
  );
  // 9. Verify expiration timestamp is present
  TestValidator.predicate(
    "expiredAt is valid date-time",
    typeof guestSession.expiredAt === "string" &&
      !isNaN(Date.parse(guestSession.expiredAt)),
  );
  // 10. Verify nested guest object is present
  TestValidator.predicate("guest object exists", guestSession.guest !== null);
  // 11. Verify nested guest has required fields (fingerprint is required, userAgent can be null)
  if (guestSession.guest) {
    TestValidator.predicate(
      "guest ID is valid UUID",
      typeof guestSession.guest.id === "string" &&
        guestSession.guest.id.length > 0,
    );
    TestValidator.predicate(
      "guest fingerprint is non-empty string",
      typeof guestSession.guest.fingerprint === "string" &&
        guestSession.guest.fingerprint.length > 0,
    );
  }
}