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
 * Test filtering member sessions by creation date range.
 *
 * This test validates the date range filtering functionality for member sessions.
 * It verifies that sessions are correctly filtered based on created_at_from and
 * created_at_to parameters, and that pagination accurately reflects the filtered
 * result count.
 *
 * Test Flow:
 * 1. Register and authenticate a member account
 * 2. Query sessions with a specific date range filter
 * 3. Validate all returned sessions fall within the specified date range
 * 4. Verify pagination metadata is consistent with the filtered results
 */
export async function test_api_member_session_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Define date range for filtering
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const created_at_from = thirtyDaysAgo.toISOString();
  const created_at_to = now.toISOString();
  // 3. Query sessions with date range filter
  const sessionResponse =
    await api.functional.hrmPlatform.member.sessions.index(memberConnection, {
      body: {
        created_at_from,
        created_at_to,
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformMemberSession.IRequest,
    });
  typia.assert(sessionResponse);
  // 4. Validate pagination structure
  TestValidator.predicate(
    "pagination exists",
    sessionResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination current page is 1",
    sessionResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    sessionResponse.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    sessionResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    sessionResponse.pagination.pages >= 0,
  );
  // 5. Validate data array exists
  TestValidator.predicate(
    "data array exists",
    Array.isArray(sessionResponse.data),
  );
  // 6. Validate all sessions fall within the date range
  const fromTime = new Date(created_at_from).getTime();
  const toTime = new Date(created_at_to).getTime();
  for (const session of sessionResponse.data) {
    const sessionTime = new Date(session.created_at).getTime();
    TestValidator.predicate(
      `session ${session.id} created_at >= from date`,
      sessionTime >= fromTime,
    );
    TestValidator.predicate(
      `session ${session.id} created_at <= to date`,
      sessionTime <= toTime,
    );
  }
  // 7. Validate pagination consistency
  // records represents total matching records, data.length is current page count
  TestValidator.predicate(
    "data length does not exceed limit",
    sessionResponse.data.length <= sessionResponse.pagination.limit,
  );
  TestValidator.predicate(
    "data length does not exceed total records",
    sessionResponse.data.length <= sessionResponse.pagination.records,
  );
  // 8. Test with narrower date range (last 7 days)
  const narrow_from = sevenDaysAgo.toISOString();
  const narrowResponse = await api.functional.hrmPlatform.member.sessions.index(
    memberConnection,
    {
      body: {
        created_at_from: narrow_from,
        created_at_to,
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformMemberSession.IRequest,
    },
  );
  typia.assert(narrowResponse);
  // 9. Validate narrow range results
  const narrowFromTime = new Date(narrow_from).getTime();
  for (const session of narrowResponse.data) {
    const sessionTime = new Date(session.created_at).getTime();
    TestValidator.predicate(
      `narrow range: session ${session.id} created_at >= from date`,
      sessionTime >= narrowFromTime,
    );
    TestValidator.predicate(
      `narrow range: session ${session.id} created_at <= to date`,
      sessionTime <= toTime,
    );
  }
  // 10. Validate narrow range pagination consistency
  TestValidator.predicate(
    "narrow range: data length does not exceed limit",
    narrowResponse.data.length <= narrowResponse.pagination.limit,
  );
  TestValidator.predicate(
    "narrow range: data length does not exceed total records",
    narrowResponse.data.length <= narrowResponse.pagination.records,
  );
}
