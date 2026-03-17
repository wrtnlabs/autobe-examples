import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformMemberSession";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member session filtering by date range.
 * 1. Register a member (creates initial session)
 * 2. Query all sessions without date filter
 * 3. Query sessions with date range that includes the session
 * 4. Query sessions with date range that excludes the session
 * 5. Validate filtering results match expectations
 */
export async function test_api_member_session_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member (this creates a session)
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(typia.random<string & tags.Format<"email">>()),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Query all sessions without date filter
  const allSessions = await api.functional.redditPlatform.member.sessions.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IRedditPlatformMemberSession.IRequest,
    },
  );
  typia.assert(allSessions);
  // 3. Query with date range filter that includes the session
  const now = new Date();
  const fromDate = new Date(now.getTime() - 1000 * 60 * 60); // 1 hour ago
  const toDate = new Date(now.getTime() + 1000 * 60 * 60); // 1 hour in future
  const filteredSessions =
    await api.functional.redditPlatform.member.sessions.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 100,
          created_at_from: fromDate.toISOString(),
          created_at_to: toDate.toISOString(),
        } satisfies IRedditPlatformMemberSession.IRequest,
      },
    );
  typia.assert(filteredSessions);
  // 4. Validate sessions within date range are returned
  TestValidator.equals(
    "sessions within date range should be returned",
    filteredSessions.data.length,
    allSessions.data.length,
  );
  // 5. Query with date range that excludes the session (far in the past)
  const farPast = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 365); // 1 year ago
  const farFuture = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 364); // 1 year ago + 1 day
  const excludedSessions =
    await api.functional.redditPlatform.member.sessions.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 100,
          created_at_from: farPast.toISOString(),
          created_at_to: farFuture.toISOString(),
        } satisfies IRedditPlatformMemberSession.IRequest,
      },
    );
  typia.assert(excludedSessions);
  // 6. Validate session is excluded when outside date range
  TestValidator.equals(
    "sessions outside date range should be filtered out",
    excludedSessions.data.length,
    0,
  );
  // 7. Validate pagination metadata is correct
  TestValidator.equals(
    "pagination current page",
    filteredSessions.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination has records",
    filteredSessions.pagination.records >= 1,
  );
}