import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_session_filter_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Create a member and establish initial session
  const memberConnection: api.IConnection = { host: connection.host };
  const password = "TestPass123!";
  const email = typia.random<string & tags.Format<"email">>();
  // Register member (creates first session)
  const member = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      displayName: RandomGenerator.name(),
      bio: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);
  const registrationTime = new Date();
  // Query all sessions for the member without date filter
  const allSessions =
    await api.functional.discussionBoard.member.sessions.index(
      memberConnection,
      {
        body: {
          limit: 100,
        } satisfies IDiscussionBoardMemberSession.IRequest,
      },
    );
  typia.assert(allSessions);
  // Verify we have at least one session
  TestValidator.predicate("sessions exist", allSessions.data.length > 0);
  // Test 1: Wide date range that includes all sessions
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneDayLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const wideRangeResult =
    await api.functional.discussionBoard.member.sessions.index(
      memberConnection,
      {
        body: {
          created_from: oneDayAgo.toISOString(),
          created_to: oneDayLater.toISOString(),
        } satisfies IDiscussionBoardMemberSession.IRequest,
      },
    );
  typia.assert(wideRangeResult);
  // All sessions should be within this wide range
  TestValidator.predicate(
    "all sessions within wide date range",
    wideRangeResult.data.every((s) => {
      const createdAt = new Date(s.created_at);
      return createdAt >= oneDayAgo && createdAt <= oneDayLater;
    }),
  );
  // Count should match when using wide filter
  TestValidator.equals(
    "wide range returns all sessions",
    wideRangeResult.pagination.records,
    allSessions.pagination.records,
  );
  // Test 2: Date range that predates member's registration (should return empty)
  const twoDaysBeforeRegistration = new Date(
    registrationTime.getTime() - 2 * 24 * 60 * 60 * 1000,
  );
  const oneDayBeforeRegistration = new Date(
    registrationTime.getTime() - 24 * 60 * 60 * 1000,
  );
  const pastRangeResult =
    await api.functional.discussionBoard.member.sessions.index(
      memberConnection,
      {
        body: {
          created_from: twoDaysBeforeRegistration.toISOString(),
          created_to: oneDayBeforeRegistration.toISOString(),
        } satisfies IDiscussionBoardMemberSession.IRequest,
      },
    );
  typia.assert(pastRangeResult);
  TestValidator.equals(
    "past range returns empty data array",
    pastRangeResult.data.length,
    0,
  );
  TestValidator.equals(
    "past range pagination records is zero",
    pastRangeResult.pagination.records,
    0,
  );
  // Test 3: Narrow date range around a specific session
  const earliestSession = [...allSessions.data].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )[0];
  const earliestTime = new Date(earliestSession.created_at);
  const narrowFrom = new Date(earliestTime.getTime() - 1000); // 1 second before
  const narrowTo = new Date(earliestTime.getTime() + 1000); // 1 second after
  const narrowRangeResult =
    await api.functional.discussionBoard.member.sessions.index(
      memberConnection,
      {
        body: {
          created_from: narrowFrom.toISOString(),
          created_to: narrowTo.toISOString(),
        } satisfies IDiscussionBoardMemberSession.IRequest,
      },
    );
  typia.assert(narrowRangeResult);
  // Verify each session in narrow range is within bounds
  TestValidator.predicate(
    "all narrow range sessions within date bounds",
    narrowRangeResult.data.every((s) => {
      const createdAt = new Date(s.created_at);
      return createdAt >= narrowFrom && createdAt <= narrowTo;
    }),
  );
  // The earliest session should be in the narrow range result
  TestValidator.predicate(
    "earliest session found in narrow range",
    narrowRangeResult.data.some((s) => s.id === earliestSession.id),
  );
  // Test 4: Date range filter with pagination
  const paginatedResult =
    await api.functional.discussionBoard.member.sessions.index(
      memberConnection,
      {
        body: {
          created_from: oneDayAgo.toISOString(),
          created_to: oneDayLater.toISOString(),
          page: 1,
          limit: 2,
        } satisfies IDiscussionBoardMemberSession.IRequest,
      },
    );
  typia.assert(paginatedResult);
  // Verify pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 2",
    paginatedResult.pagination.limit,
    2,
  );
  // Verify pagination.records matches filtered count
  TestValidator.equals(
    "pagination records matches wide range count",
    paginatedResult.pagination.records,
    wideRangeResult.pagination.records,
  );
  // Test 5: Only created_from filter (lower bound only)
  const fromDateResult =
    await api.functional.discussionBoard.member.sessions.index(
      memberConnection,
      {
        body: {
          created_from: oneDayAgo.toISOString(),
        } satisfies IDiscussionBoardMemberSession.IRequest,
      },
    );
  typia.assert(fromDateResult);
  TestValidator.predicate(
    "from-only filter sessions after created_from",
    fromDateResult.data.every((s) => {
      const createdAt = new Date(s.created_at);
      return createdAt >= oneDayAgo;
    }),
  );
  // Test 6: Only created_to filter (upper bound only)
  const toDateResult =
    await api.functional.discussionBoard.member.sessions.index(
      memberConnection,
      {
        body: {
          created_to: oneDayLater.toISOString(),
        } satisfies IDiscussionBoardMemberSession.IRequest,
      },
    );
  typia.assert(toDateResult);
  TestValidator.predicate(
    "to-only filter sessions before created_to",
    toDateResult.data.every((s) => {
      const createdAt = new Date(s.created_at);
      return createdAt <= oneDayLater;
    }),
  );
}
