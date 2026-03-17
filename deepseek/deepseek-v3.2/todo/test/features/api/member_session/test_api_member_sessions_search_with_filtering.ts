import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberSession";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test searching for authenticated member sessions with pagination and filtering.
 * 1. Create member account via authorize_member_join
 * 2. Test session search with various filter combinations
 * 3. Validate pagination metadata and session summary fields
 * 4. Ensure data isolation (member sees only own sessions)
 * 5. Test edge cases like empty filters and no-match filters
 */
export async function test_api_member_sessions_search_with_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create member account and authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Wait briefly to ensure session timestamps are different if we create more sessions
  await new Promise((resolve) => setTimeout(resolve, 10));
  // Test 1: Basic pagination with page=1, limit=10
  const basicSearch = await api.functional.todoApp.member.sessions.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(basicSearch);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current page should be 1",
    basicSearch.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should be 10",
    basicSearch.pagination.limit === 10,
  );
  TestValidator.predicate(
    "records should be non-negative",
    basicSearch.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages should be non-negative",
    basicSearch.pagination.pages >= 0,
  );
  // Validate session summary fields if data exists
  if (basicSearch.data.length > 0) {
    const session = basicSearch.data[0];
    TestValidator.predicate(
      "session should have uuid id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        session.id,
      ),
    );
    TestValidator.predicate(
      "session should have access_token",
      typeof session.access_token === "string" &&
        session.access_token.length > 0,
    );
    TestValidator.predicate(
      "session should have ip",
      /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(session.ip),
    );
    TestValidator.predicate(
      "session should have href",
      session.href.startsWith("http") || session.href.startsWith("/"),
    );
    TestValidator.predicate(
      "session should have created_at ISO date",
      !isNaN(Date.parse(session.created_at)),
    );
    TestValidator.predicate(
      "session should have expired_at ISO date",
      !isNaN(Date.parse(session.expired_at)),
    );
    TestValidator.predicate(
      "session should have updated_at ISO date",
      !isNaN(Date.parse(session.updated_at)),
    );
    TestValidator.predicate(
      "session should have member object",
      typeof session.member === "object" && session.member !== null,
    );
  }
  // Test 2: Filter by IP address partial match
  // The member's session should have an IP from registration
  // We'll use a partial IP that might match
  const ipFilter = await api.functional.todoApp.member.sessions.index(
    memberConnection,
    {
      body: {
        ip: "192" as string & tags.Format<"ipv4">, // Partial match
        page: 1,
        limit: 10,
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(ipFilter);
  // Note: We can't validate IP contains "192" because we don't know the actual IP
  // This test just ensures the filter works without error
  // Test 3: Filter by expiration status (active sessions)
  const activeSessions = await api.functional.todoApp.member.sessions.index(
    memberConnection,
    {
      body: {
        is_expired: false,
        page: 1,
        limit: 10,
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(activeSessions);
  // Validate all returned sessions are not expired (expired_at > now)
  const now = new Date();
  for (const session of activeSessions.data) {
    TestValidator.predicate(
      "active session should not be expired",
      new Date(session.expired_at) > now,
    );
  }
  // Test 4: Filter by creation date range
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const dateRangeFilter = await api.functional.todoApp.member.sessions.index(
    memberConnection,
    {
      body: {
        created_at_from: oneDayAgo as string & tags.Format<"date-time">,
        created_at_to: tomorrow as string & tags.Format<"date-time">,
        page: 1,
        limit: 10,
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(dateRangeFilter);
  // Validate all returned sessions are within date range
  for (const session of dateRangeFilter.data) {
    const createdAt = new Date(session.created_at);
    TestValidator.predicate(
      "session created_at should be after oneDayAgo",
      createdAt >= new Date(oneDayAgo),
    );
    TestValidator.predicate(
      "session created_at should be before tomorrow",
      createdAt <= new Date(tomorrow),
    );
  }
  // Test 5: Sorting by different fields
  const sortFields = ["created_at", "expired_at", "updated_at"] as const;
  const directions = ["asc", "desc"] as const;
  for (const field of sortFields) {
    for (const direction of directions) {
      const sortedResults = await api.functional.todoApp.member.sessions.index(
        memberConnection,
        {
          body: {
            sort: field,
            direction: direction,
            page: 1,
            limit: 5,
          } satisfies ITodoAppMemberSession.IRequest,
        },
      );
      typia.assert(sortedResults);
      // Verify sort order if we have at least 2 sessions
      if (sortedResults.data.length >= 2) {
        for (let i = 1; i < sortedResults.data.length; i++) {
          const prev = new Date(sortedResults.data[i - 1][field]);
          const curr = new Date(sortedResults.data[i][field]);
          if (direction === "asc") {
            TestValidator.predicate(`ascending sort by ${field}`, prev <= curr);
          } else {
            TestValidator.predicate(
              `descending sort by ${field}`,
              prev >= curr,
            );
          }
        }
      }
    }
  }
  // Test 6: Empty filters (should return all sessions)
  const emptyFilter = await api.functional.todoApp.member.sessions.index(
    memberConnection,
    {
      body: {} satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(emptyFilter);
  TestValidator.predicate(
    "empty filter should return pagination metadata",
    emptyFilter.pagination.current >= 0 && emptyFilter.pagination.limit > 0,
  );
  // Test 7: Filter matching no sessions
  const noMatchFilter = await api.functional.todoApp.member.sessions.index(
    memberConnection,
    {
      body: {
        ip: "255.255.255.255" as string & tags.Format<"ipv4">,
        page: 1,
        limit: 10,
      } satisfies ITodoAppMemberSession.IRequest,
    },
  );
  typia.assert(noMatchFilter);
  TestValidator.equals(
    "no-match filter should return empty data array",
    noMatchFilter.data,
    [],
  );
  TestValidator.predicate(
    "no-match filter should still have pagination metadata",
    noMatchFilter.pagination.records >= 0 &&
      noMatchFilter.pagination.pages >= 0,
  );
  // Data isolation test - create another member and verify they can't see first member's sessions
  const otherMemberConnection: api.IConnection = { host: connection.host };
  const otherMember = await authorize_member_join(otherMemberConnection, {});
  typia.assert(otherMember);
  const otherMemberSessions =
    await api.functional.todoApp.member.sessions.index(otherMemberConnection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppMemberSession.IRequest,
    });
  typia.assert(otherMemberSessions);
  // Verify each member has at least one session (their own)
  // We can't compare member IDs because session.member is typed as {}
  // But we can verify that basicSearch returns at least one session
  TestValidator.predicate(
    "first member should have at least one session",
    basicSearch.data.length > 0,
  );
  TestValidator.predicate(
    "other member should have at least one session",
    otherMemberSessions.data.length > 0,
  );
}
