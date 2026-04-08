import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneModeratorSession";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditCloneModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModeratorSession";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

/**
 * Test filtering capabilities for moderator session listing with various filter combinations.
 *
 * Validates the moderator session listing endpoint's filtering functionality by creating multiple sessions with different attributes and testing various filter scenarios. Ensures that sessions can be filtered by date range, IP address, expiration status, and href URL, both individually and in combination.
 *
 * Special attention is given to verifying that pagination metadata accurately reflects the filtered result count and that multiple filters work together correctly to narrow down results.
 *
 * 1. Authenticate as moderator to gain access to session management.
 * 2. Create additional login sessions with different IP addresses and href URLs.
 * 3. Retrieve all sessions to establish baseline count.
 * 4. Test date range filtering with createdAtFrom and createdAtTo.
 * 5. Test IP address filtering to find sessions from specific network locations.
 * 6. Test expiration status filtering with isExpired parameter.
 * 7. Test href URL filtering to find sessions with specific redirect URLs.
 * 8. Test combined filters to verify they work together correctly.
 * 9. Validate pagination metadata reflects accurate filtered counts.
 */
export async function test_api_moderator_session_list_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as moderator
  const moderatorPassword = RandomGenerator.alphaNumeric(16);
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: moderatorPassword,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(moderator);
  // 2. Create additional login sessions with different attributes
  const login1Connection: api.IConnection = { host: connection.host };
  const login1 = await authorize_moderator_login(login1Connection, {
    body: {
      email: moderator.email,
      password: moderatorPassword,
      href: "https://example.com/dashboard",
      referrer: "https://example.com/login",
      ip: "192.168.1.100",
    },
  });
  typia.assert(login1);
  const login2Connection: api.IConnection = { host: connection.host };
  const login2 = await authorize_moderator_login(login2Connection, {
    body: {
      email: moderator.email,
      password: moderatorPassword,
      href: "https://example.com/admin",
      referrer: "https://example.com/login",
      ip: "192.168.1.200",
    },
  });
  typia.assert(login2);
  const login3Connection: api.IConnection = { host: connection.host };
  const login3 = await authorize_moderator_login(login3Connection, {
    body: {
      email: moderator.email,
      password: moderatorPassword,
      href: "https://example.com/dashboard",
      referrer: "https://google.com",
      ip: "10.0.0.50",
    },
  });
  typia.assert(login3);
  // 3. Retrieve all sessions to establish baseline
  const allSessions =
    await api.functional.redditClone.moderator.moderator.sessions.index(
      moderatorConnection,
      { body: {} satisfies IRedditCloneModeratorSession.IRequest },
    );
  typia.assert(allSessions);
  TestValidator.predicate("has sessions", allSessions.data.length >= 1);
  // 4. Test date range filtering
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const dateFilteredSessions =
    await api.functional.redditClone.moderator.moderator.sessions.index(
      moderatorConnection,
      {
        body: {
          createdAtFrom: oneHourAgo.toISOString(),
          createdAtTo: now.toISOString(),
        } satisfies IRedditCloneModeratorSession.IRequest,
      },
    );
  typia.assert(dateFilteredSessions);
  TestValidator.equals(
    "date filtered sessions count",
    dateFilteredSessions.pagination.records,
    dateFilteredSessions.data.length,
  );
  // 5. Test IP address filtering
  const ipFilteredSessions =
    await api.functional.redditClone.moderator.moderator.sessions.index(
      moderatorConnection,
      {
        body: {
          ip: "192.168.1.100",
        } satisfies IRedditCloneModeratorSession.IRequest,
      },
    );
  typia.assert(ipFilteredSessions);
  TestValidator.predicate(
    "all sessions have correct IP",
    ipFilteredSessions.data.every((s) => s.ip === "192.168.1.100"),
  );
  // 6. Test expiration status filtering (active sessions)
  const activeSessions =
    await api.functional.redditClone.moderator.moderator.sessions.index(
      moderatorConnection,
      {
        body: {
          isExpired: false,
        } satisfies IRedditCloneModeratorSession.IRequest,
      },
    );
  typia.assert(activeSessions);
  TestValidator.predicate(
    "active sessions not expired",
    activeSessions.data.every((s) => new Date(s.expired_at) > now),
  );
  // 7. Test href URL filtering
  const hrefFilteredSessions =
    await api.functional.redditClone.moderator.moderator.sessions.index(
      moderatorConnection,
      {
        body: {
          href: "https://example.com/dashboard",
        } satisfies IRedditCloneModeratorSession.IRequest,
      },
    );
  typia.assert(hrefFilteredSessions);
  TestValidator.equals(
    "href filtered sessions count",
    hrefFilteredSessions.pagination.records,
    hrefFilteredSessions.data.length,
  );
  TestValidator.predicate(
    "all sessions have correct href",
    hrefFilteredSessions.data.every(
      (s) => s.href === "https://example.com/dashboard",
    ),
  );
  // 8. Test combined filters (IP + href)
  const combinedFilteredSessions =
    await api.functional.redditClone.moderator.moderator.sessions.index(
      moderatorConnection,
      {
        body: {
          ip: "192.168.1.100",
          href: "https://example.com/dashboard",
        } satisfies IRedditCloneModeratorSession.IRequest,
      },
    );
  typia.assert(combinedFilteredSessions);
  TestValidator.predicate(
    "combined filter returns correct sessions",
    combinedFilteredSessions.data.every(
      (s) =>
        s.ip === "192.168.1.100" && s.href === "https://example.com/dashboard",
    ),
  );
  // 9. Validate pagination metadata
  TestValidator.equals(
    "pagination records match data length",
    combinedFilteredSessions.pagination.records,
    combinedFilteredSessions.data.length,
  );
  TestValidator.predicate(
    "pagination current page is 1",
    combinedFilteredSessions.pagination.current === 1,
  );
}
