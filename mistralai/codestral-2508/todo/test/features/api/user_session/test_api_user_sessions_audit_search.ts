import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListUserSession";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

/**
 * Test paginated search and audit filtering for a user's authentication
 * sessions.
 *
 * Covers all metadata filters and pagination/sorting.
 *
 * 1. Generate a userId (UUID)
 * 2. Create a diverse set of session data for this user (ip, href, referrer,
 *    created_at, expired_at)
 * 3. Create out-of-user (other user) sessions for negative test
 * 4. Test unfiltered search returns all user-owned sessions only
 * 5. Test filter by ip (partial and exact)
 * 6. Test filter by href (origin) and referrer (substring)
 * 7. Test filter by date range (created_from/created_to)
 * 8. Test filter by expired=true
 * 9. Test filter by expired=false (active sessions only)
 * 10. Test combined filters
 * 11. Test pagination (page/limit) and sort options
 * 12. Test search for another user's sessions (should not be exposed)
 * 13. For every search, validate paged, sorted, filtered session results are
 *     correct and all access control rules are enforced.
 */
export async function test_api_user_sessions_audit_search(
  connection: api.IConnection,
) {
  // Data setup
  const userId = typia.random<string & tags.Format<"uuid">>();
  const otherUserId = typia.random<string & tags.Format<"uuid">>();
  const sessionCount = 10;
  // Diverse IPs, hrefs, referrers, timestamps
  const ips = ["10.0.1.1", "192.168.2.100", "127.0.0.1", "172.22.2.2"];
  const hrefs = [
    "https://login.todo.com",
    "https://app.todo.com/start",
    "https://m.todo.com/",
  ];
  const referrers = [
    "https://google.com",
    "https://company.com",
    "https://todo.com/register",
  ];
  const now = new Date();
  // Sessions for main user
  const sessions: ITodoListUserSession.ISummary[] = ArrayUtil.repeat(
    sessionCount,
    (i) => {
      const created_at = new Date(
        now.getTime() - i * 60 * 60 * 1000,
      ).toISOString(); // oldest later idx
      const expired_at =
        i % 3 === 0
          ? new Date(now.getTime() - i * 30 * 60 * 1000).toISOString()
          : null;
      return {
        id: typia.random<string & tags.Format<"uuid">>(),
        ip: RandomGenerator.pick(ips),
        href: RandomGenerator.pick(hrefs) as string & tags.Format<"uri">,
        referrer: RandomGenerator.pick(referrers) as string &
          tags.Format<"uri">,
        created_at,
        expired_at,
        user: {
          id: userId,
          email: typia.random<string & tags.Format<"email">>(),
          display_name: RandomGenerator.name(2),
          created_at: new Date(now.getTime() - 10000).toISOString(),
        },
      };
    },
  );
  // Sessions for another user (should never be shown in userId-scoped queries)
  const otherSessions: ITodoListUserSession.ISummary[] = ArrayUtil.repeat(
    3,
    (i) => ({
      id: typia.random<string & tags.Format<"uuid">>(),
      ip: "203.0.113.10",
      href: "https://rogue.todo.com/",
      referrer: "https://evil.com/",
      created_at: new Date(now.getTime() - (i + 6) * 3600000).toISOString(),
      expired_at: null,
      user: {
        id: otherUserId,
        email: typia.random<string & tags.Format<"email">>(),
        display_name: RandomGenerator.name(1),
        created_at: new Date(now.getTime() - 30000).toISOString(),
      },
    }),
  );
  // Combine for local manual filtering
  const allSessions = [...sessions, ...otherSessions];
  // 1. Unfiltered search (should return ALL sessions for userId, paginated)
  {
    const body = {
      page: 1 as number & tags.Type<"int32">,
      limit: 100 as number & tags.Type<"int32">,
    } satisfies ITodoListUserSession.IRequest;
    const res = await api.functional.todoList.users.sessions.index(connection, {
      userId,
      body,
    });
    typia.assert(res);
    const gotSessionIds = res.data.map((s) => s.id);
    TestValidator.equals(
      "return all sessions matching userId",
      gotSessionIds.sort(),
      sessions.map((s) => s.id).sort(),
    );
    // Confirm all returned sessions are for correct user
    TestValidator.predicate(
      "every result session.user.id = userId",
      res.data.every((sess) => sess.user.id === userId),
    );
  }
  // 2. Filter by IP (partial, should match some sessions)
  {
    const targetIpFragment = sessions[1].ip.substring(0, 5);
    const expectedSessions = sessions.filter((x) =>
      x.ip.includes(targetIpFragment),
    );
    const body = {
      ip: targetIpFragment,
      page: 1 as number & tags.Type<"int32">,
      limit: 50 as number & tags.Type<"int32">,
    } satisfies ITodoListUserSession.IRequest;
    const res = await api.functional.todoList.users.sessions.index(connection, {
      userId,
      body,
    });
    typia.assert(res);
    const gotIds = res.data.map((s) => s.id);
    TestValidator.equals(
      "filter by partial IP matches expected",
      gotIds.sort(),
      expectedSessions.map((x) => x.id).sort(),
    );
  }
  // 3. Filter by href (origin, exact)
  {
    const targetHref = sessions[2].href;
    const body = {
      href: targetHref,
      page: 1 as number & tags.Type<"int32">,
      limit: sessionCount as number & tags.Type<"int32">,
    } satisfies ITodoListUserSession.IRequest;
    const expectedSessions = sessions.filter((x) => x.href === targetHref);
    const res = await api.functional.todoList.users.sessions.index(connection, {
      userId,
      body,
    });
    typia.assert(res);
    TestValidator.equals(
      "exact href search results",
      res.data.length,
      expectedSessions.length,
    );
    TestValidator.equals(
      "matching session ids for href",
      res.data.map((x) => x.id).sort(),
      expectedSessions.map((x) => x.id).sort(),
    );
  }
  // 4. Filter by referrer (substring)
  {
    const substring = sessions[1].referrer.slice(0, 15);
    const expectedSessions = sessions.filter((x) =>
      x.referrer.includes(substring),
    );
    const body = {
      referrer: substring,
      page: 1 as number & tags.Type<"int32">,
      limit: 30 as number & tags.Type<"int32">,
    } satisfies ITodoListUserSession.IRequest;
    const res = await api.functional.todoList.users.sessions.index(connection, {
      userId,
      body,
    });
    typia.assert(res);
    TestValidator.equals(
      "substring referrer filter works",
      res.data.length,
      expectedSessions.length,
    );
  }
  // 5. Filter by date range (created_from, created_to)
  {
    // Take some sessions to get date bounds
    const boundA = sessions[2].created_at;
    const boundB = sessions[7].created_at;
    // pick min/max
    const created_from = boundB < boundA ? boundB : boundA;
    const created_to = boundB < boundA ? boundA : boundB;
    const expectedSessions = sessions.filter(
      (s) => s.created_at >= created_from && s.created_at <= created_to,
    );
    const body = {
      created_from,
      created_to,
      page: 1 as number & tags.Type<"int32">,
      limit: 50 as number & tags.Type<"int32">,
    } satisfies ITodoListUserSession.IRequest;
    const res = await api.functional.todoList.users.sessions.index(connection, {
      userId,
      body,
    });
    typia.assert(res);
    TestValidator.equals(
      "date range search returns correct count",
      res.data.length,
      expectedSessions.length,
    );
  }
  // 6. Filter by expired=true/false
  {
    // true -> only with expired_at present
    const bodyExpired = {
      expired: true,
      page: 1 as number & tags.Type<"int32">,
      limit: 50 as number & tags.Type<"int32">,
    } satisfies ITodoListUserSession.IRequest;
    const expected = sessions.filter(
      (x) => x.expired_at !== null && x.expired_at !== undefined,
    );
    const res = await api.functional.todoList.users.sessions.index(connection, {
      userId,
      body: bodyExpired,
    });
    typia.assert(res);
    TestValidator.equals(
      "expired:true returns sessions that are expired",
      res.data.map((x) => x.id).sort(),
      expected.map((x) => x.id).sort(),
    );
    // false (undefined) -> all sessions
    const bodyActive = {
      expired: false,
      page: 1 as number & tags.Type<"int32">,
      limit: 50 as number & tags.Type<"int32">,
    } satisfies ITodoListUserSession.IRequest;
    const expectedActive = sessions.filter(
      (x) => x.expired_at === null || x.expired_at === undefined,
    );
    const resActive = await api.functional.todoList.users.sessions.index(
      connection,
      { userId, body: bodyActive },
    );
    typia.assert(resActive);
    TestValidator.equals(
      "expired:false returns only non-expired",
      resActive.data.map((x) => x.id).sort(),
      expectedActive.map((x) => x.id).sort(),
    );
  }
  // 7. Combined filters: IP + href + referrer + expired
  {
    const targetSess = sessions[0];
    const body = {
      ip: targetSess.ip,
      href: targetSess.href,
      referrer: targetSess.referrer,
      expired:
        targetSess.expired_at !== null && targetSess.expired_at !== undefined,
      page: 1 as number & tags.Type<"int32">,
      limit: 10 as number & tags.Type<"int32">,
    } satisfies ITodoListUserSession.IRequest;
    const expected = sessions.filter(
      (x) =>
        x.ip === targetSess.ip &&
        x.href === targetSess.href &&
        x.referrer === targetSess.referrer &&
        ((body.expired &&
          x.expired_at !== null &&
          x.expired_at !== undefined) ||
          (!body.expired &&
            (x.expired_at === null || x.expired_at === undefined))),
    );
    const res = await api.functional.todoList.users.sessions.index(connection, {
      userId,
      body,
    });
    typia.assert(res);
    TestValidator.equals(
      "combined filters returns correct set",
      res.data.map((x) => x.id).sort(),
      expected.map((x) => x.id).sort(),
    );
  }
  // 8. Pagination testing (small limit, get 1st and 2nd pages, sort desc)
  {
    const body = {
      page: 1 as number & tags.Type<"int32">,
      limit: 4 as number & tags.Type<"int32">,
      sort: "created_at:desc",
    } satisfies ITodoListUserSession.IRequest;
    const sortedSessions = [...sessions].sort((a, b) =>
      b.created_at.localeCompare(a.created_at),
    );
    const page1 = await api.functional.todoList.users.sessions.index(
      connection,
      { userId, body },
    );
    typia.assert(page1);
    TestValidator.equals(
      "pagination: page 1 count matches limit",
      page1.data.length,
      body.limit,
    );
    TestValidator.equals(
      "pagination: page 1 IDs match sorted",
      page1.data.map((x) => x.id),
      sortedSessions.slice(0, body.limit).map((x) => x.id),
    );
    // Next page
    const body2 = {
      ...body,
      page: 2 as number & tags.Type<"int32">,
    } satisfies ITodoListUserSession.IRequest;
    const page2 = await api.functional.todoList.users.sessions.index(
      connection,
      { userId, body: body2 },
    );
    typia.assert(page2);
    TestValidator.equals(
      "pagination: page 2 count matches remainder or zero",
      page2.data.length,
      Math.max(0, sortedSessions.length - body.limit),
    );
    TestValidator.equals(
      "pagination: page 2 IDs match sorted",
      page2.data.map((x) => x.id),
      sortedSessions.slice(body.limit, body.limit * 2).map((x) => x.id),
    );
  }
  // 9. Sorting by created_at:asc and expired_at:desc (if applicable)
  {
    // created_at ascending
    const bodyAsc = {
      page: 1 as number & tags.Type<"int32">,
      limit: sessionCount as number & tags.Type<"int32">,
      sort: "created_at:asc",
    } satisfies ITodoListUserSession.IRequest;
    const ascSorted = [...sessions].sort((a, b) =>
      a.created_at.localeCompare(b.created_at),
    );
    const pageAsc = await api.functional.todoList.users.sessions.index(
      connection,
      { userId, body: bodyAsc },
    );
    typia.assert(pageAsc);
    TestValidator.equals(
      "sort created_at:asc",
      pageAsc.data.map((x) => x.id),
      ascSorted.map((x) => x.id),
    );
    // expired_at desc, filter to expired only
    const expired = sessions.filter(
      (x) => x.expired_at !== null && x.expired_at !== undefined,
    );
    if (expired.length > 1) {
      const bodyExp = {
        page: 1 as number & tags.Type<"int32">,
        limit: expired.length as number & tags.Type<"int32">,
        sort: "expired_at:desc",
        expired: true,
      } satisfies ITodoListUserSession.IRequest;
      const sortedExp = [...expired].sort((a, b) =>
        b.expired_at!.localeCompare(a.expired_at!),
      );
      const pageSortExp = await api.functional.todoList.users.sessions.index(
        connection,
        { userId, body: bodyExp },
      );
      typia.assert(pageSortExp);
      TestValidator.equals(
        "sort expired_at:desc",
        pageSortExp.data.map((x) => x.id),
        sortedExp.map((x) => x.id),
      );
    }
  }
  // 10. Access control: querying another user's sessions yields no data
  {
    const body = {
      page: 1 as number & tags.Type<"int32">,
      limit: 10 as number & tags.Type<"int32">,
    } satisfies ITodoListUserSession.IRequest;
    const res = await api.functional.todoList.users.sessions.index(connection, {
      userId: otherUserId,
      body,
    });
    typia.assert(res);
    TestValidator.equals(
      "other user's session search returns only their sessions",
      res.data.map((x) => x.user.id).every((id) => id === otherUserId),
      true,
    );
    // Should not leak sessions for the main userId
    TestValidator.predicate(
      "should not return test user sessions in otherUser results",
      res.data.every((sess) => sess.user.id !== userId),
    );
  }
}
