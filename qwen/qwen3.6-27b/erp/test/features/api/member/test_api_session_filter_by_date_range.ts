import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test session date range filtering capability with startDate and endDate parameters.
 *
 * Validates the query filtering logic for member sessions by creation date range. After a member joins (creating an initial session at the join timestamp), queries sessions with specific date ranges using createdAt BETWEEN startDate AND endDate logic. Ensures that sessions created within the specified range are returned, while sessions outside the range are excluded.
 *
 * Additional validations include confirming that pagination works correctly in conjunction with date filtering, and that the response contains proper pagination metadata reflecting the filtered result set.
 *
 * 1. Member joins the platform, creating an initial session record with current timestamp.
 * 2. Query sessions with date range that includes the session's creation date → should return the session.
 * 3. Query sessions with date range before the session was created → should return empty data array.
 * 4. Query sessions with date range after the session was created → should return empty data array.
 * 5. Validate pagination metadata reflects filtered results correctly.
 */
export async function test_api_session_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins - creates initial session at join timestamp
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // Calculate date strings in YYYY-MM-DD format for date range filtering
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const yesterday = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const theDayBefore = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  // 2. Query with date range that includes today's session → should return at least one session
  const inclusiveRange = await api.functional.hrmPlatform.member.sessions.index(
    memberConnection,
    {
      body: {
        startDate: twoDaysAgo,
        endDate: today,
      } satisfies IHrmPlatformMemberSession.IRequest,
    },
  );
  typia.assert(inclusiveRange);
  TestValidator.equals(
    "session date range includes today has sessions",
    inclusiveRange.data.length >= 1,
    true,
  );
  TestValidator.predicate(
    "inclusive range pagination metadata valid",
    inclusiveRange.pagination.records >= 1,
  );
  // 3. Query with date range entirely before session created → should return empty
  const pastRange = await api.functional.hrmPlatform.member.sessions.index(
    memberConnection,
    {
      body: {
        startDate: theDayBefore,
        endDate: yesterday,
      } satisfies IHrmPlatformMemberSession.IRequest,
    },
  );
  typia.assert(pastRange);
  TestValidator.equals(
    "date range before session returns empty",
    pastRange.data.length,
    0,
  );
  TestValidator.equals(
    "past range records count is zero",
    pastRange.pagination.records,
    0,
  );
  // 4. Query with future date range → should return empty (no sessions exist in future)
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const dayAfterTomorrow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const futureRange = await api.functional.hrmPlatform.member.sessions.index(
    memberConnection,
    {
      body: {
        startDate: tomorrow,
        endDate: dayAfterTomorrow,
      } satisfies IHrmPlatformMemberSession.IRequest,
    },
  );
  typia.assert(futureRange);
  TestValidator.equals(
    "future date range returns empty",
    futureRange.data.length,
    0,
  );
}
