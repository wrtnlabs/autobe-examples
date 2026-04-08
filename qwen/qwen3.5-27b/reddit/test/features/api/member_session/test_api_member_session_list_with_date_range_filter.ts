import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneMemberSession";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member session list filtering by creation and expiration date ranges.
 *
 * Validates that the session list endpoint correctly filters sessions based on creation date range (created_at_from, created_at_to) and expiration date range (expired_at_from, expired_at_to). Tests individual filter types, combined filters, and edge cases including empty result sets.
 *
 * The test verifies that filters use inclusive boundaries (on or after, on or before), combined filters use AND logic, and empty results return proper pagination metadata.
 *
 * 1. Register a new member account, which creates an initial session
 * 2. Retrieve the session list to get the baseline session data
 * 3. Test created_at_from filter: filter sessions created on or after a specific timestamp
 * 4. Test created_at_to filter: filter sessions created on or before a specific timestamp
 * 5. Test expired_at_from filter: filter sessions expiring on or after a specific timestamp
 * 6. Test expired_at_to filter: filter sessions expiring on or before a specific timestamp
 * 7. Test combined filters: apply both creation and expiration range filters simultaneously
 * 8. Test empty result: use a date range that matches no sessions
 * 9. Validate pagination metadata for empty results (records=0, pages=0)
 */
export async function test_api_member_session_list_with_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(member);
  // 2. Get baseline session list
  const baselineSessions =
    await api.functional.redditClone.member.member.sessions.index(
      memberConnection,
      {
        body: {
          member_id: member.id,
        } satisfies IRedditCloneMemberSession.IRequest,
      },
    );
  typia.assert(baselineSessions);
  TestValidator.predicate(
    "baseline sessions exist",
    baselineSessions.data.length > 0,
  );
  // Get the first session for filter testing
  const firstSession = baselineSessions.data[0];
  typia.assert(firstSession);
  const sessionCreated_at = firstSession.created_at;
  const sessionExpired_at = firstSession.expired_at;
  // 3. Test created_at_from filter (sessions created on or after this timestamp)
  const createdFromResult =
    await api.functional.redditClone.member.member.sessions.index(
      memberConnection,
      {
        body: {
          member_id: member.id,
          created_at_from: sessionCreated_at,
        } satisfies IRedditCloneMemberSession.IRequest,
      },
    );
  typia.assert(createdFromResult);
  TestValidator.predicate(
    "created_at_from returns session",
    createdFromResult.data.length > 0,
  );
  TestValidator.equals(
    "session created_at >= filter",
    createdFromResult.data[0].created_at,
    sessionCreated_at,
  );
  // 4. Test created_at_to filter (sessions created on or before this timestamp)
  const createdToResult =
    await api.functional.redditClone.member.member.sessions.index(
      memberConnection,
      {
        body: {
          member_id: member.id,
          created_at_to: sessionCreated_at,
        } satisfies IRedditCloneMemberSession.IRequest,
      },
    );
  typia.assert(createdToResult);
  TestValidator.predicate(
    "created_at_to returns session",
    createdToResult.data.length > 0,
  );
  TestValidator.equals(
    "session created_at <= filter",
    createdToResult.data[0].created_at,
    sessionCreated_at,
  );
  // 5. Test expired_at_from filter (sessions expiring on or after this timestamp)
  const expiredFromResult =
    await api.functional.redditClone.member.member.sessions.index(
      memberConnection,
      {
        body: {
          member_id: member.id,
          expired_at_from: sessionExpired_at,
        } satisfies IRedditCloneMemberSession.IRequest,
      },
    );
  typia.assert(expiredFromResult);
  TestValidator.predicate(
    "expired_at_from returns session",
    expiredFromResult.data.length > 0,
  );
  TestValidator.equals(
    "session expired_at >= filter",
    expiredFromResult.data[0].expired_at,
    sessionExpired_at,
  );
  // 6. Test expired_at_to filter (sessions expiring on or before this timestamp)
  const expiredToResult =
    await api.functional.redditClone.member.member.sessions.index(
      memberConnection,
      {
        body: {
          member_id: member.id,
          expired_at_to: sessionExpired_at,
        } satisfies IRedditCloneMemberSession.IRequest,
      },
    );
  typia.assert(expiredToResult);
  TestValidator.predicate(
    "expired_at_to returns session",
    expiredToResult.data.length > 0,
  );
  TestValidator.equals(
    "session expired_at <= filter",
    expiredToResult.data[0].expired_at,
    sessionExpired_at,
  );
  // 7. Test combined filters (both creation and expiration ranges)
  const combinedResult =
    await api.functional.redditClone.member.member.sessions.index(
      memberConnection,
      {
        body: {
          member_id: member.id,
          created_at_from: sessionCreated_at,
          created_at_to: sessionCreated_at,
          expired_at_from: sessionExpired_at,
          expired_at_to: sessionExpired_at,
        } satisfies IRedditCloneMemberSession.IRequest,
      },
    );
  typia.assert(combinedResult);
  TestValidator.predicate(
    "combined filters return session",
    combinedResult.data.length > 0,
  );
  TestValidator.equals(
    "combined filter session created_at matches",
    combinedResult.data[0].created_at,
    sessionCreated_at,
  );
  TestValidator.equals(
    "combined filter session expired_at matches",
    combinedResult.data[0].expired_at,
    sessionExpired_at,
  );
  // 8. Test empty result: date range that matches no sessions
  const futureDate = new Date(Date.now() + 86400000 * 365).toISOString(); // 1 year in future
  const emptyResult =
    await api.functional.redditClone.member.member.sessions.index(
      memberConnection,
      {
        body: {
          member_id: member.id,
          created_at_from: futureDate,
          created_at_to: futureDate,
        } satisfies IRedditCloneMemberSession.IRequest,
      },
    );
  typia.assert(emptyResult);
  // 9. Validate empty result pagination
  TestValidator.equals("empty result data array", emptyResult.data.length, 0);
  TestValidator.equals(
    "empty result pagination records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result pagination pages",
    emptyResult.pagination.pages,
    0,
  );
}
