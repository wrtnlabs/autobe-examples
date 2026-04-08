import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformGuestSession";
import type { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import type { IRedditPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_sessions_listing_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest session for authentication
  const guestConnection: api.IConnection = { host: connection.host };
  const guestSession = await authorize_guest_join(guestConnection, {
    body: {
      fingerprint: typia.random<string>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(guestSession);
  // 2. Test pagination with page=1, limit=20 (default sort: created_at DESC)
  const response1: IPageIRedditPlatformGuestSession.ISummary =
    await api.functional.redditPlatform.guest.guest_sessions.index(
      guestConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sortBy: "createdAt",
        },
      },
    );
  typia.assert(response1);
  // Validate pagination metadata
  TestValidator.equals("page 1 current page", response1.pagination.current, 1);
  TestValidator.equals("page 1 limit", response1.pagination.limit, 20);
  TestValidator.predicate(
    "page 1 records non-negative",
    response1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 1 pages calculated correctly",
    response1.pagination.pages ===
      Math.max(1, Math.ceil(response1.pagination.records / 20)),
  );
  // Validate guest session records structure
  if (response1.data.length > 0) {
    const firstSession = response1.data[0];
    typia.assert(firstSession);
    TestValidator.equals("session id is UUID", firstSession.id.length, 36);
    TestValidator.predicate("session ip is valid", firstSession.ip.length > 0);
    TestValidator.predicate(
      "session href is valid",
      firstSession.href.length > 0,
    );
    TestValidator.predicate(
      "session referrer is valid or null",
      firstSession.referrer === null || firstSession.referrer.length > 0,
    );
    TestValidator.predicate(
      "session created_at is valid datetime",
      !isNaN(Date.parse(firstSession.created_at)),
    );
    TestValidator.predicate(
      "session expired_at is valid datetime",
      !isNaN(Date.parse(firstSession.expired_at)),
    );
  }
  // 3. Test pagination with page=2
  const response2: IPageIRedditPlatformGuestSession.ISummary =
    await api.functional.redditPlatform.guest.guest_sessions.index(
      guestConnection,
      {
        body: {
          page: 2,
          limit: 20,
        },
      },
    );
  typia.assert(response2);
  TestValidator.equals("page 2 current page", response2.pagination.current, 2);
  TestValidator.notEquals(
    "page 2 different data from page 1",
    response1.data,
    response2.data,
  );
  // 4. Test limit=10
  const response3: IPageIRedditPlatformGuestSession.ISummary =
    await api.functional.redditPlatform.guest.guest_sessions.index(
      guestConnection,
      {
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(response3);
  TestValidator.equals(
    "limit 10 current page",
    response3.pagination.current,
    1,
  );
  TestValidator.equals("limit 10 limit", response3.pagination.limit, 10);
  TestValidator.predicate(
    "limit 10 actual records match limit or less",
    response3.data.length <= 10,
  );
  // 5. Test limit=50
  const response4: IPageIRedditPlatformGuestSession.ISummary =
    await api.functional.redditPlatform.guest.guest_sessions.index(
      guestConnection,
      {
        body: {
          page: 1,
          limit: 50,
        },
      },
    );
  typia.assert(response4);
  TestValidator.equals(
    "limit 50 current page",
    response4.pagination.current,
    1,
  );
  TestValidator.equals("limit 50 limit", response4.pagination.limit, 50);
  TestValidator.predicate(
    "limit 50 actual records match limit or less",
    response4.data.length <= 50,
  );
  // 6. Test ascending sort order
  const response5: IPageIRedditPlatformGuestSession.ISummary =
    await api.functional.redditPlatform.guest.guest_sessions.index(
      guestConnection,
      {
        body: {
          page: 1,
          sortBy: "createdAsc",
        },
      },
    );
  typia.assert(response5);
  // Verify default descending sort has more recent sessions first
  if (response1.data.length > 1) {
    const firstSessionCreated = new Date(response1.data[0].created_at);
    const secondSessionCreated = new Date(response1.data[1].created_at);
    TestValidator.predicate(
      "default sort is newest first (descending)",
      firstSessionCreated >= secondSessionCreated,
    );
  }
  // Verify ascending sort has oldest sessions first
  if (response5.data.length > 1) {
    const firstSessionCreated = new Date(response5.data[0].created_at);
    const secondSessionCreated = new Date(response5.data[1].created_at);
    TestValidator.predicate(
      "ascending sort is oldest first",
      firstSessionCreated <= secondSessionCreated,
    );
  }
}
