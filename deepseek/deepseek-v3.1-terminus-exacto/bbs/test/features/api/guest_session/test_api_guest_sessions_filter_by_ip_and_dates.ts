import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuestSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_sessions_filter_by_ip_and_dates(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest connection using utility function
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  // 2. We need to create multiple guest sessions to test filtering
  // However, there's no API endpoint to create guest sessions in the provided SDK
  // The guest sessions are created when guests join via POST /discussionBoard/auth/guest/join
  // So we need to create multiple guest connections with different properties
  const sessions: Array<{
    connection: api.IConnection;
    ip: string & tags.Format<"ipv4">;
    href: string & tags.Format<"uri">;
    referrer: string & tags.Format<"uri">;
    device_fingerprint: string;
  }> = [];
  // Create sessions with different IPs and timestamps
  const ips = [
    "192.168.1.1" satisfies string & tags.Format<"ipv4">,
    "192.168.1.2" satisfies string & tags.Format<"ipv4">,
    "192.168.1.1" satisfies string & tags.Format<"ipv4">, // Same IP as first for testing
    "192.168.2.1" satisfies string & tags.Format<"ipv4">,
  ] as const;
  // Create sessions sequentially with slight time delay to get different created_at timestamps
  for (const ip of ips) {
    const guestConn: api.IConnection = { host: connection.host };
    const deviceFingerprint = RandomGenerator.alphaNumeric(32);
    const href = typia.random<string & tags.Format<"uri">>();
    const referrer = typia.random<string & tags.Format<"uri">>();
    const auth = await authorize_guest_join(guestConn, {
      body: {
        device_fingerprint: deviceFingerprint,
        href,
        referrer,
        ip,
      },
    });
    typia.assert(auth);
    sessions.push({
      connection: guestConn,
      ip,
      href,
      referrer,
      device_fingerprint: deviceFingerprint,
    });
    // Small delay to ensure different timestamps
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  // Wait a bit for all sessions to be indexed
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 3. Test filtering by specific IP address (192.168.1.1)
  const filterByIp = await api.functional.discussionBoard.guest.sessions.index(
    guestConnection,
    {
      body: {
        ip: "192.168.1.1" satisfies string & tags.Format<"ipv4">,
      } satisfies IDiscussionBoardGuestSession.IRequest,
    },
  );
  typia.assert(filterByIp);
  // Verify we get sessions with IP 192.168.1.1 (2 sessions should have this IP)
  TestValidator.equals(
    "filter by IP 192.168.1.1 returns correct sessions",
    filterByIp.data.length,
    2,
  );
  TestValidator.predicate(
    "all returned sessions have IP 192.168.1.1",
    filterByIp.data.every((session) => session.ip === "192.168.1.1"),
  );
  // 4. Test filtering by non-existent IP address
  const filterByNonExistentIp =
    await api.functional.discussionBoard.guest.sessions.index(guestConnection, {
      body: {
        ip: "10.0.0.1" satisfies string & tags.Format<"ipv4">,
      } satisfies IDiscussionBoardGuestSession.IRequest,
    });
  typia.assert(filterByNonExistentIp);
  TestValidator.equals(
    "filter by non-existent IP returns empty results",
    filterByNonExistentIp.data.length,
    0,
  );
  // 5. Test date range filtering - get all sessions
  const allSessions = await api.functional.discussionBoard.guest.sessions.index(
    guestConnection,
    {
      body: {} satisfies IDiscussionBoardGuestSession.IRequest,
    },
  );
  typia.assert(allSessions);
  if (allSessions.data.length > 0) {
    // Sort by creation time to get earliest and latest
    const sortedSessions = [...allSessions.data].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    const middleSession = sortedSessions[Math.floor(sortedSessions.length / 2)];
    const filterAfterTime = new Date(middleSession.created_at);
    // Filter for sessions created after middle session
    const filterByDate =
      await api.functional.discussionBoard.guest.sessions.index(
        guestConnection,
        {
          body: {
            created_at: filterAfterTime.toISOString(),
          } satisfies IDiscussionBoardGuestSession.IRequest,
        },
      );
    typia.assert(filterByDate);
    TestValidator.predicate(
      "date filter returns sessions created after specified time",
      filterByDate.data.every(
        (session) =>
          new Date(session.created_at).getTime() >= filterAfterTime.getTime(),
      ),
    );
  }
  // 6. Test combined filtering (IP and date range)
  if (allSessions.data.length > 0) {
    const ip192Sessions = allSessions.data.filter((s) =>
      s.ip.startsWith("192.168.1"),
    );
    if (ip192Sessions.length > 0) {
      const earliestIp192Session = ip192Sessions.reduce((earliest, current) =>
        new Date(current.created_at).getTime() <
        new Date(earliest.created_at).getTime()
          ? current
          : earliest,
      );
      const combinedFilter =
        await api.functional.discussionBoard.guest.sessions.index(
          guestConnection,
          {
            body: {
              ip: "192.168.1.1" satisfies string & tags.Format<"ipv4">,
              created_at: earliestIp192Session.created_at,
            } satisfies IDiscussionBoardGuestSession.IRequest,
          },
        );
      typia.assert(combinedFilter);
      TestValidator.predicate(
        "combined filter returns sessions matching both criteria",
        combinedFilter.data.every(
          (session) =>
            session.ip === "192.168.1.1" &&
            new Date(session.created_at).getTime() >=
              new Date(earliestIp192Session.created_at).getTime(),
        ),
      );
    }
  }
  // 7. Test pagination
  const page1 = await api.functional.discussionBoard.guest.sessions.index(
    guestConnection,
    {
      body: {
        limit: 2,
        page: 1,
      } satisfies IDiscussionBoardGuestSession.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals(
    "page 1 with limit 2 returns correct page size",
    page1.data.length <= 2,
    true,
  );
  if (page1.pagination.pages > 1) {
    const page2 = await api.functional.discussionBoard.guest.sessions.index(
      guestConnection,
      {
        body: {
          limit: 2,
          page: 2,
        } satisfies IDiscussionBoardGuestSession.IRequest,
      },
    );
    typia.assert(page2);
    TestValidator.notEquals(
      "page 1 and page 2 have different data",
      page1.data.map((s) => s.id).sort(),
      page2.data.map((s) => s.id).sort(),
    );
  }
}
