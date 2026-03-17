import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityMemberSession";
import type { IRedditCommunityDateTimeRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityDateTimeRange";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMemberSession";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_sessions_filter_by_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member and create initial session
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(authResult);
  typia.assert(authResult.token);
  // 2. Generate date range for filtering
  const now = new Date();
  const dateRangeStart = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 7); // 7 days ago
  const dateRangeEnd = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 1); // 1 day ahead
  // 3. Query sessions with date range filter
  const filteredSession =
    await api.functional.redditCommunity.member.sessions.index(
      memberConnection,
      {
        body: {
          created_at: {
            gte: dateRangeStart.toISOString(),
            lte: dateRangeEnd.toISOString(),
          },
        } satisfies IRedditCommunityMemberSession.IRequest,
      },
    );
  typia.assert(filteredSession);
  // 4. Validate response structure
  typia.assert(filteredSession.pagination);
  typia.assert(filteredSession.data);
  // 5. Validate pagination metadata
  const pagination = filteredSession.pagination;
  TestValidator.predicate(
    "pagination has valid current page",
    pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    pagination.limit >= 1 && pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination has valid records count",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages count",
    pagination.pages >= 0,
  );
  // 6. Validate all sessions in response are within date range
  for (const session of filteredSession.data) {
    typia.assert(session);
    typia.assert(session.created_at);
    const sessionDate = new Date(session.created_at);
    const startDate = new Date(dateRangeStart.toISOString());
    const endDate = new Date(dateRangeEnd.toISOString());
    // Verify session created_at is within range
    TestValidator.predicate(
      "session created_at >= gte",
      sessionDate >= startDate,
    );
    TestValidator.predicate(
      "session created_at <= lte",
      sessionDate <= endDate,
    );
  }
}
