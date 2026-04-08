import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityMemberSession";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test basic guest session listing functionality with session metadata validation.
 *
 * Validates the complete guest session listing workflow including guest authentication, session retrieval, and response structure validation. Ensures that the session list correctly returns session metadata including ID, IP address, creation timestamp, expiration timestamp, and tracking URLs (href and referrer).
 *
 * Special attention is given to verifying that the session created during join appears in the list with accurate metadata, and that sensitive token values are not exposed in the session summary response.
 *
 * 1. Create guest session with randomized device fingerprint and tracking information.
 * 2. Retrieve session list using authenticated guest connection.
 * 3. Validate pagination structure with metadata and data array.
 * 4. Verify session contains required fields with correct values matching join input.
 * 5. Ensure no sensitive token values are exposed in response.
 */
export async function test_api_guest_session_list_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest session with tracking information
  const guestConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    deviceFingerprint: RandomGenerator.alphaNumeric(32),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IRedditCommunityGuest.IJoin;
  const guest = await authorize_guest_join(guestConnection, {
    body: joinInput,
  });
  typia.assert(guest);
  // 2. Retrieve session list
  const sessionList = await api.functional.redditCommunity.guest.sessions.index(
    guestConnection,
    {
      body: {} satisfies IRedditCommunityMemberSession.IRequest,
    },
  );
  typia.assert(sessionList);
  // 3. Validate pagination structure
  TestValidator.predicate(
    "pagination exists",
    sessionList.pagination !== undefined,
  );
  TestValidator.predicate("data array exists", Array.isArray(sessionList.data));
  TestValidator.predicate(
    "has at least one session",
    sessionList.data.length >= 1,
  );
  // 4. Validate pagination metadata
  const pagination = sessionList.pagination;
  TestValidator.predicate("current page is valid", pagination.current >= 1);
  TestValidator.predicate(
    "limit is valid",
    pagination.limit >= 1 && pagination.limit <= 100,
  );
  TestValidator.predicate("records count is valid", pagination.records >= 0);
  TestValidator.predicate("pages count is valid", pagination.pages >= 0);
  // 5. Find and validate the session created during join
  const createdSession = sessionList.data.find(
    (session) => session.ip === joinInput.ip,
  );
  TestValidator.predicate(
    "created session found in list",
    createdSession !== undefined,
  );
  if (createdSession !== undefined) {
    // 6. Validate session metadata fields exist
    TestValidator.predicate(
      "session has valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        createdSession.id,
      ),
    );
    TestValidator.equals(
      "IP matches join input",
      createdSession.ip,
      joinInput.ip,
    );
    TestValidator.equals(
      "href matches join input",
      createdSession.href,
      joinInput.href,
    );
    TestValidator.equals(
      "referrer matches join input",
      createdSession.referrer,
      joinInput.referrer,
    );
    // 7. Validate timestamps are valid ISO 8601 date-time format
    TestValidator.predicate(
      "created_at is valid date-time",
      !isNaN(Date.parse(createdSession.created_at)),
    );
    TestValidator.predicate(
      "expired_at is valid date-time",
      !isNaN(Date.parse(createdSession.expired_at)),
    );
    // 8. Verify expiration is after creation
    TestValidator.predicate(
      "expiration is after creation",
      new Date(createdSession.expired_at).getTime() >
        new Date(createdSession.created_at).getTime(),
    );
  }
  // 9. Validate all sessions in the list have required fields and no sensitive data
  for (const session of sessionList.data) {
    // Required fields validation
    TestValidator.predicate("session id exists", session.id !== undefined);
    TestValidator.predicate("session ip exists", session.ip !== undefined);
    TestValidator.predicate("session href exists", session.href !== undefined);
    TestValidator.predicate(
      "session referrer exists",
      session.referrer !== undefined,
    );
    TestValidator.predicate(
      "session created_at exists",
      session.created_at !== undefined,
    );
    TestValidator.predicate(
      "session expired_at exists",
      session.expired_at !== undefined,
    );
    // Ensure no sensitive token fields are exposed
    TestValidator.predicate(
      "no access token in session",
      !("access" in session || "token" in session || "access_token" in session),
    );
    TestValidator.predicate(
      "no refresh token in session",
      !("refresh" in session || "refresh_token" in session),
    );
  }
}
