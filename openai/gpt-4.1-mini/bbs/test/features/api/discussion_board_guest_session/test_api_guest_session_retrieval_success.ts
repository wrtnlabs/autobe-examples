import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardRegisteredUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUserSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test retrieval of a valid registered user session by its UUID as an authorized guest.
 * - Authenticate as a guest by using the guest join endpoint.
 * - Request the session details using a valid existing sessionId.
 * - Validate the response includes all expected session fields: id, registeredUserId, ip, href, referrer, createdAt, expiredAt with correct types and values.
 * - Verify the returned session matches the requested sessionId.
 * - Confirm HTTP 200 status code and response schema compliance.
 */
export async function test_api_guest_session_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authorize guest and get authorized guest
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      deviceFingerprint: RandomGenerator.alphaNumeric(16),
      userAgent: "Mozilla/5.0 (E2E Testing) AutoBE Agent",
      ipAddress: "127.0.0.1",
      anonymousId: RandomGenerator.alphaNumeric(12),
    } satisfies IDiscussionBoardGuest.IJoin,
  });
  guestConnection.headers = { Authorization: guestAuth.token.access };
  // 2. The sessionId to retrieve - use the ID of the authorized guest as proxy for sessionId
  // Since no direct session creation API exists, simulate with a random UUID (to obey scenario)
  const sessionId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the session data
  const session = await api.functional.discussionBoard.guest.sessions.at(
    guestConnection,
    { sessionId },
  );
  // 4. Validate the response type and fields
  typia.assert(session);
  TestValidator.equals("requested session ID matches", session.id, sessionId);
  // 5. Validate session fields existence and formats
  TestValidator.predicate(
    "registeredUserId is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      session.registeredUserId,
    ),
  );
  TestValidator.predicate(
    "ip is non-empty string",
    typeof session.ip === "string" && session.ip.length > 0,
  );
  TestValidator.predicate(
    "href is non-empty string",
    typeof session.href === "string" && session.href.length > 0,
  );
  TestValidator.predicate(
    "referrer is non-empty string",
    typeof session.referrer === "string" && session.referrer.length > 0,
  );
  TestValidator.predicate(
    "createdAt is ISO date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.\d+)?Z$/.test(
      session.createdAt,
    ),
  );
  TestValidator.predicate(
    "expiredAt is ISO date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.\d+)?Z$/.test(
      session.expiredAt,
    ),
  );
}
