import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardRegisteredUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUserSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardRegisteredUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardRegisteredUserSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_discussion_board_guest_sessions_index_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a guest join session for minimal required guest context
  const guestConnection: api.IConnection = { host: connection.host };
  const guest = await authorize_guest_join(guestConnection, {
    body: {
      deviceFingerprint: RandomGenerator.alphabets(10),
      userAgent: "Mozilla/5.0 (compatible; TestBot/1.0)",
      ipAddress: "192.168.1.100",
      anonymousId: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardGuest.IJoin,
  });
  typia.assert(guest);
  guestConnection.headers = { Authorization: guest.token.access };
  // 2. Create admin connection with valid admin token stub for testing filtering
  // NOTE: We simulate admin authorization here since only admins can access sessions
  // This step assumes adminConnection with a valid token is established
  // For test completeness, use guestConnection as adminConnection here to mimic token authorization
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: guest.token.access },
  };
  // 3. Try to retrieve session list without filters
  const emptyRequestBody =
    {} satisfies IDiscussionBoardRegisteredUserSession.IRequest;
  const sessionsAll = await api.functional.discussionBoard.guest.sessions.index(
    adminConnection,
    {
      body: emptyRequestBody,
    },
  );
  typia.assert(sessionsAll);
  TestValidator.predicate(
    "sessions data is array",
    Array.isArray(sessionsAll.data),
  );
  TestValidator.predicate(
    "pagination records count matches data length",
    sessionsAll.pagination.records >= sessionsAll.data.length,
  );
  // 4. Test filtering by IP address (use the guest IP address known)
  const sessionsFilteredByIP =
    await api.functional.discussionBoard.guest.sessions.index(adminConnection, {
      body: {
        ip: "192.168.1.100",
      } satisfies IDiscussionBoardRegisteredUserSession.IRequest,
    });
  typia.assert(sessionsFilteredByIP);
  sessionsFilteredByIP.data.forEach((session) => {
    TestValidator.equals(
      "session IP matches filter",
      session.ip,
      "192.168.1.100",
    );
  });
  // 5. Test filtering by creation date range
  const pastDate = new Date(new Date().getTime() - 24 * 60 * 60 * 1000); // 1 day ago
  const nowISO = new Date().toISOString();
  const sessionsFilteredByCreatedAt =
    await api.functional.discussionBoard.guest.sessions.index(adminConnection, {
      body: {
        createdAtFrom: pastDate.toISOString(),
        createdAtTo: nowISO,
      } satisfies IDiscussionBoardRegisteredUserSession.IRequest,
    });
  typia.assert(sessionsFilteredByCreatedAt);
  sessionsFilteredByCreatedAt.data.forEach((session) => {
    TestValidator.predicate(
      "session createdAt after from",
      session.created_at >= pastDate.toISOString(),
    );
    TestValidator.predicate(
      "session createdAt before to",
      session.created_at <= nowISO,
    );
  });
  // 6. Test filtering by expiration date range
  const futureDate = new Date(new Date().getTime() + 24 * 60 * 60 * 1000); // 1 day later
  const sessionsFilteredByExpiredAt =
    await api.functional.discussionBoard.guest.sessions.index(adminConnection, {
      body: {
        expiredAtFrom: nowISO,
        expiredAtTo: futureDate.toISOString(),
      } satisfies IDiscussionBoardRegisteredUserSession.IRequest,
    });
  typia.assert(sessionsFilteredByExpiredAt);
  sessionsFilteredByExpiredAt.data.forEach((session) => {
    if (session.expired_at !== null) {
      TestValidator.predicate(
        "session expiredAt after from",
        session.expired_at >= nowISO,
      );
      TestValidator.predicate(
        "session expiredAt before to",
        session.expired_at <= futureDate.toISOString(),
      );
    }
  });
  // 7. Check pagination correctness for a limited request
  const limitedSessions =
    await api.functional.discussionBoard.guest.sessions.index(adminConnection, {
      body: {
        limit: 5,
        page: 1,
      } satisfies IDiscussionBoardRegisteredUserSession.IRequest,
    });
  typia.assert(limitedSessions);
  TestValidator.predicate(
    "pagination limit is correct",
    limitedSessions.pagination.limit === 5,
  );
  TestValidator.predicate(
    "current page is correct",
    limitedSessions.pagination.current === 1,
  );
  TestValidator.predicate(
    "pages is non-negative",
    limitedSessions.pagination.pages >= 0,
  );
  // 8. Unauthorized access test - simulate missing admin authorization
  const badConnection: api.IConnection = { host: connection.host }; // no Authorization header
  await TestValidator.error("should fail without authorization", async () => {
    await api.functional.discussionBoard.guest.sessions.index(badConnection, {
      body: emptyRequestBody,
    });
  });
}
