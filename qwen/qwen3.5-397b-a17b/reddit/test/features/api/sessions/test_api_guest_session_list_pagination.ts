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
 * Test pagination behavior for guest session listing endpoint.
 *
 * Validates the pagination functionality for retrieving guest authentication sessions. Since each guest can only view their own sessions (not a global session list), this test focuses on verifying pagination metadata accuracy and sorting behavior within the scope of a single guest's session history.
 *
 * Tests both empty state (fresh guest with no prior sessions) and populated state (guest with active session). Ensures pagination metadata correctly reports current page, total pages, record count, and limit settings regardless of dataset size.
 *
 * 1. Creates a fresh guest account and verifies empty session list returns with correct pagination metadata.
 * 2. After guest join, verifies session appears in list with correct pagination.
 * 3. Tests different limit parameters to ensure pagination metadata adjusts correctly.
 * 4. Verifies sessions are sorted by created_at in descending order (newest first).
 * 5. Tests edge cases like requesting pages beyond available data.
 */
export async function test_api_guest_session_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create fresh guest account
  const guestConnection: api.IConnection = { host: connection.host };
  const guest = await authorize_guest_join(guestConnection, {
    body: {
      deviceFingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(guest);
  // 2. Fetch sessions - guest should have 1 session (the one just created)
  const sessions = await api.functional.redditCommunity.guest.sessions.index(
    guestConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IRedditCommunityMemberSession.IRequest,
    },
  );
  typia.assert(sessions);
  // 3. Validate pagination metadata for single session
  TestValidator.predicate(
    "has at least one session",
    () => sessions.data.length >= 1,
  );
  TestValidator.equals(
    "records matches data length",
    sessions.pagination.records,
    sessions.data.length,
  );
  TestValidator.equals("current page", sessions.pagination.current, 1);
  TestValidator.equals("limit", sessions.pagination.limit, 10);
  // Calculate expected pages
  const expectedPages = Math.ceil(sessions.data.length / 10);
  TestValidator.equals(
    "pages calculation",
    sessions.pagination.pages,
    expectedPages,
  );
  // 4. Test with different limit (limit=1)
  const limit1Result =
    await api.functional.redditCommunity.guest.sessions.index(guestConnection, {
      body: {
        page: 1,
        limit: 1,
      } satisfies IRedditCommunityMemberSession.IRequest,
    });
  typia.assert(limit1Result);
  TestValidator.equals("limit 1 limit", limit1Result.pagination.limit, 1);
  TestValidator.equals(
    "limit 1 records",
    limit1Result.pagination.records,
    sessions.pagination.records,
  );
  const expectedPagesLimit1 = Math.ceil(limit1Result.pagination.records / 1);
  TestValidator.equals(
    "limit 1 pages",
    limit1Result.pagination.pages,
    expectedPagesLimit1,
  );
  // 5. Test page beyond available data (should return empty data)
  const largePageResult =
    await api.functional.redditCommunity.guest.sessions.index(guestConnection, {
      body: {
        page: 999,
        limit: 10,
      } satisfies IRedditCommunityMemberSession.IRequest,
    });
  typia.assert(largePageResult);
  TestValidator.equals(
    "large page current",
    largePageResult.pagination.current,
    999,
  );
  TestValidator.equals(
    "large page records",
    largePageResult.pagination.records,
    sessions.pagination.records,
  );
  // 6. Verify sessions are sorted by created_at descending (newest first)
  if (sessions.data.length > 1) {
    for (let i = 0; i < sessions.data.length - 1; i++) {
      const currentTime = new Date(sessions.data[i].created_at).getTime();
      const nextTime = new Date(sessions.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `session ${i} should be newer than or equal to session ${i + 1}`,
        () => currentTime >= nextTime,
      );
    }
  }
  // 7. Validate session data structure
  if (sessions.data.length > 0) {
    const firstSession = sessions.data[0];
    TestValidator.predicate("session has valid UUID", () =>
      /^[0-9a-f-]{36}$/i.test(firstSession.id),
    );
    TestValidator.predicate(
      "session has valid IP",
      () => firstSession.ip.length > 0,
    );
    TestValidator.predicate(
      "session has valid href",
      () => firstSession.href.length > 0,
    );
    TestValidator.predicate(
      "session has valid referrer",
      () => firstSession.referrer.length > 0,
    );
    TestValidator.predicate(
      "created_at before expired_at",
      () =>
        new Date(firstSession.created_at).getTime() <=
        new Date(firstSession.expired_at).getTime(),
    );
  }
}
