import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneGuestSession";
import type { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
import type { IRedditCloneGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_filtering_by_ip_and_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first guest session with specific IP
  const guestConnection1: api.IConnection = { host: connection.host };
  const guest1 = await authorize_guest_join(guestConnection1, {
    body: {
      fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: "192.168.1.100",
    },
  });
  typia.assert(guest1);
  // Wait a bit to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 2. Create second guest session with different IP
  const guestConnection2: api.IConnection = { host: connection.host };
  const guest2 = await authorize_guest_join(guestConnection2, {
    body: {
      fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: "192.168.1.101",
    },
  });
  typia.assert(guest2);
  // Get current time for date range filtering
  const afterGuest1Creation = new Date();
  // 3. Query with exact IP filter (should return 1 session)
  const ipFilterResult =
    await api.functional.redditClone.guest.guest_sessions.index(
      guestConnection1,
      {
        body: {
          ip: "192.168.1.100",
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IRedditCloneGuestSession.IRequest,
      },
    );
  typia.assert(ipFilterResult);
  TestValidator.equals(
    "should return at least 1 session for IP 192.168.1.100",
    ipFilterResult.data.length >= 1,
    true,
  );
  TestValidator.equals(
    "total records should be at least 1",
    ipFilterResult.pagination.records >= 1,
    true,
  );
  // 4. Query with partial IP filter (should return sessions with matching prefix)
  const partialIpFilter =
    await api.functional.redditClone.guest.guest_sessions.index(
      guestConnection1,
      {
        body: {
          ip: "192.168",
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IRedditCloneGuestSession.IRequest,
      },
    );
  typia.assert(partialIpFilter);
  TestValidator.predicate(
    "should return sessions matching partial IP prefix",
    partialIpFilter.data.length >= 2,
  );
  // 5. Query with date range filter (createdAtFrom only)
  const dateRangeResult =
    await api.functional.redditClone.guest.guest_sessions.index(
      guestConnection1,
      {
        body: {
          createdAtFrom: afterGuest1Creation.toISOString() as string &
            tags.Format<"date-time">,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IRedditCloneGuestSession.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  TestValidator.predicate(
    "should return sessions created after specified date",
    dateRangeResult.data.length >= 1,
  );
  // 6. Query with pagination (page 1, limit 1)
  const page1Result =
    await api.functional.redditClone.guest.guest_sessions.index(
      guestConnection1,
      {
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 1 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IRedditCloneGuestSession.IRequest,
      },
    );
  typia.assert(page1Result);
  TestValidator.equals(
    "page 1 should have 1 record",
    page1Result.data.length,
    1,
  );
  TestValidator.equals(
    "current page should be 1",
    page1Result.pagination.current,
    1,
  );
  TestValidator.equals("limit should be 1", page1Result.pagination.limit, 1);
  // 7. Query page 2 (should have different records if more than 1 total)
  const page2Result =
    await api.functional.redditClone.guest.guest_sessions.index(
      guestConnection1,
      {
        body: {
          page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 1 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IRedditCloneGuestSession.IRequest,
      },
    );
  typia.assert(page2Result);
  TestValidator.equals(
    "current page should be 2",
    page2Result.pagination.current,
    2,
  );
  TestValidator.equals("limit should be 1", page2Result.pagination.limit, 1);
}
