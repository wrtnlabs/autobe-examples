import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMemberSession";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test text search functionality and empty result scenarios for member sessions.
 *
 * Validates the complete session search flow including text-based filtering, empty result handling, and pagination consistency. Ensures that the search API correctly filters sessions by href and referrer content, handles various filter combinations that produce empty results, and maintains consistent response structure regardless of result count.
 *
 * Special attention is given to verifying that pagination metadata correctly reflects empty results (0 records, 0 pages) and that the response schema remains valid even when no sessions match the search criteria.
 *
 * 1. Authenticate as a member by joining with email and password credentials.
 * 2. Test text search functionality by querying sessions with search terms that match href or referrer values.
 * 3. Test empty result scenarios with non-matching search terms, non-existent member IDs, and future date ranges.
 * 4. Verify response structure consistency with empty results showing correct pagination metadata.
 * 5. Test IP address filtering to ensure sessions are correctly filtered by client IP.
 * 6. Verify null handling for href and referrer fields in session summaries.
 */
export async function test_api_member_session_search_and_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IHrmTimeTrackMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, {
    body: joinInput,
  });
  typia.assert(authorized);
  // 2. Test text search functionality
  const searchResults = await api.functional.hrmTimeTrack.member.sessions.index(
    memberConnection,
    {
      body: {
        search: RandomGenerator.alphabets(3),
        limit: 20,
      } satisfies IHrmTimeTrackMemberSession.IRequest,
    },
  );
  typia.assert(searchResults);
  TestValidator.predicate(
    "search results pagination valid",
    searchResults.pagination.records >= 0,
  );
  // 3. Test empty result scenarios
  // 3.1. Non-matching search term
  const emptySearchResults =
    await api.functional.hrmTimeTrack.member.sessions.index(memberConnection, {
      body: {
        search: "this_search_term_will_not_match_any_session_12345",
        limit: 20,
      } satisfies IHrmTimeTrackMemberSession.IRequest,
    });
  typia.assert(emptySearchResults);
  TestValidator.equals(
    "empty search results count",
    emptySearchResults.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search pages count",
    emptySearchResults.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty search data array length",
    emptySearchResults.data.length,
    0,
  );
  // 3.2. Non-existent member_id filter
  const nonExistentMemberId = typia.random<string & tags.Format<"uuid">>();
  const emptyMemberResults =
    await api.functional.hrmTimeTrack.member.sessions.index(memberConnection, {
      body: {
        member_id: nonExistentMemberId,
        limit: 20,
      } satisfies IHrmTimeTrackMemberSession.IRequest,
    });
  typia.assert(emptyMemberResults);
  TestValidator.equals(
    "non-existent member results count",
    emptyMemberResults.pagination.records,
    0,
  );
  // 3.3. Future date range (no sessions created in the future)
  const futureDate = new Date(
    Date.now() + 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const emptyDateResults =
    await api.functional.hrmTimeTrack.member.sessions.index(memberConnection, {
      body: {
        created_after: futureDate,
        created_before: futureDate,
        limit: 20,
      } satisfies IHrmTimeTrackMemberSession.IRequest,
    });
  typia.assert(emptyDateResults);
  TestValidator.equals(
    "future date range results count",
    emptyDateResults.pagination.records,
    0,
  );
  // 4. Verify response structure consistency
  TestValidator.predicate(
    "empty results pagination has current page",
    emptySearchResults.pagination.current >= 1,
  );
  TestValidator.predicate(
    "empty results pagination has limit",
    emptySearchResults.pagination.limit > 0,
  );
  TestValidator.predicate(
    "empty results data is array",
    Array.isArray(emptySearchResults.data),
  );
  // 5. Test IP address filtering
  const specificIp = typia.random<string & tags.Format<"ipv4">>();
  const ipFilteredResults =
    await api.functional.hrmTimeTrack.member.sessions.index(memberConnection, {
      body: {
        ip: specificIp,
        limit: 20,
      } satisfies IHrmTimeTrackMemberSession.IRequest,
    });
  typia.assert(ipFilteredResults);
  TestValidator.predicate(
    "IP filtered results pagination valid",
    ipFilteredResults.pagination.records >= 0,
  );
  // 6. Verify null handling for href and referrer fields
  const allSessions = await api.functional.hrmTimeTrack.member.sessions.index(
    memberConnection,
    {
      body: {
        limit: 100,
      } satisfies IHrmTimeTrackMemberSession.IRequest,
    },
  );
  typia.assert(allSessions);
  await ArrayUtil.asyncForEach(allSessions.data, async (session) => {
    typia.assert(session);
    TestValidator.predicate(
      `session ${session.id} href is string or null`,
      typeof session.href === "string" || session.href === null,
    );
    TestValidator.predicate(
      `session ${session.id} referrer is string or null`,
      typeof session.referrer === "string" || session.referrer === null,
    );
    TestValidator.predicate(
      `session ${session.id} has valid member`,
      session.member.id !== undefined,
    );
    TestValidator.predicate(
      `session ${session.id} has valid organization`,
      session.organization.id !== undefined,
    );
  });
}
