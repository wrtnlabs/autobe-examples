import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityMemberSession";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_session_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member and create authenticated connection
  const memberAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${memberAuth.token.access}`,
    },
  };
  // 2. Fetch all sessions without date filter (baseline)
  const allSessions =
    await api.functional.redditCommunity.member.sessions.index(
      memberConnection,
      {
        body: {
          limit: 100,
          sort: "created_at",
        } satisfies IRedditCommunityMemberSession.IRequest,
      },
    );
  typia.assert(allSessions);
  // 3. Test with created_at_from parameter (sessions after a specific date)
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sessionsFromOneHourAgo =
    await api.functional.redditCommunity.member.sessions.index(
      memberConnection,
      {
        body: {
          created_at_from: oneHourAgo.toISOString(),
          limit: 100,
          sort: "created_at",
        } satisfies IRedditCommunityMemberSession.IRequest,
      },
    );
  typia.assert(sessionsFromOneHourAgo);
  // Validate all returned sessions are after or equal to created_at_from
  for (const session of sessionsFromOneHourAgo.data) {
    TestValidator.predicate(
      "session created_at >= created_at_from",
      new Date(session.created_at).getTime() >= oneHourAgo.getTime(),
    );
  }
  // 4. Test with created_at_to parameter (sessions before a specific date)
  const sessionsToNow =
    await api.functional.redditCommunity.member.sessions.index(
      memberConnection,
      {
        body: {
          created_at_to: now.toISOString(),
          limit: 100,
          sort: "created_at",
        } satisfies IRedditCommunityMemberSession.IRequest,
      },
    );
  typia.assert(sessionsToNow);
  // Validate all returned sessions are before or equal to created_at_to
  for (const session of sessionsToNow.data) {
    TestValidator.predicate(
      "session created_at <= created_at_to",
      new Date(session.created_at).getTime() <= now.getTime(),
    );
  }
  // 5. Test with both created_at_from and created_at_to (date range)
  const sessionsInRange =
    await api.functional.redditCommunity.member.sessions.index(
      memberConnection,
      {
        body: {
          created_at_from: oneDayAgo.toISOString(),
          created_at_to: now.toISOString(),
          limit: 100,
          sort: "created_at",
        } satisfies IRedditCommunityMemberSession.IRequest,
      },
    );
  typia.assert(sessionsInRange);
  // Validate all returned sessions are within the date range
  for (const session of sessionsInRange.data) {
    const sessionTime = new Date(session.created_at).getTime();
    TestValidator.predicate(
      "session created_at >= created_at_from",
      sessionTime >= oneDayAgo.getTime(),
    );
    TestValidator.predicate(
      "session created_at <= created_at_to",
      sessionTime <= now.getTime(),
    );
  }
  // 6. Test edge case: created_at_from equals created_at_to (single point in time)
  const specificTime = oneHourAgo.toISOString();
  const sessionsAtSpecificTime =
    await api.functional.redditCommunity.member.sessions.index(
      memberConnection,
      {
        body: {
          created_at_from: specificTime,
          created_at_to: specificTime,
          limit: 100,
          sort: "created_at",
        } satisfies IRedditCommunityMemberSession.IRequest,
      },
    );
  typia.assert(sessionsAtSpecificTime);
  // Validate all returned sessions match the specific time (within second precision)
  const specificTimeMs = new Date(specificTime).getTime();
  for (const session of sessionsAtSpecificTime.data) {
    const sessionTime = new Date(session.created_at).getTime();
    // Allow 1 second tolerance for timestamp comparison
    TestValidator.predicate(
      "session created_at matches specific time",
      Math.abs(sessionTime - specificTimeMs) <= 1000,
    );
  }
  // 7. Validate pagination metadata for filtered results
  TestValidator.predicate(
    "pagination current page is valid",
    allSessions.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    allSessions.pagination.limit >= 1 && allSessions.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    allSessions.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    allSessions.pagination.pages >= 0,
  );
  // 8. Verify sessions are sorted by created_at descending (newest first)
  if (allSessions.data.length > 1) {
    for (let i = 0; i < allSessions.data.length - 1; i++) {
      const currentTime = new Date(allSessions.data[i].created_at).getTime();
      const nextTime = new Date(allSessions.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        "sessions sorted by created_at descending",
        currentTime >= nextTime,
      );
    }
  }
  // 9. Validate session data structure
  if (allSessions.data.length > 0) {
    const firstSession = allSessions.data[0];
    TestValidator.predicate(
      "session has valid UUID id",
      /^[0-9a-f-]{36}$/i.test(firstSession.id),
    );
    TestValidator.predicate(
      "session has valid IP address",
      firstSession.ip.length > 0,
    );
    TestValidator.predicate(
      "session has valid href URI",
      firstSession.href.length > 0,
    );
    TestValidator.predicate(
      "session has valid referrer URI",
      firstSession.referrer.length > 0,
    );
    TestValidator.predicate(
      "session member has valid UUID id",
      /^[0-9a-f-]{36}$/i.test(firstSession.member.id),
    );
    TestValidator.equals(
      "session member id matches authenticated member",
      firstSession.member.id,
      memberAuth.id,
    );
  }
}
