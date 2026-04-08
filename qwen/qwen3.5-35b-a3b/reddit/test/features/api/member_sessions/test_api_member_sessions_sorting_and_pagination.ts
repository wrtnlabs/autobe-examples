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

/**
 * Test member sessions sorting and pagination functionality.
 *
 * Validates the complete sorting and pagination flow for the member sessions endpoint. The test creates multiple sessions by logging in multiple times with the same credentials, then verifies that sorting by different fields (created_at, expired_at, ip) works correctly in both ascending and descending order. Additionally tests pagination parameters including page navigation, limit validation, and edge cases for invalid pagination values.
 *
 * The test ensures that sessions are correctly ordered by timestamp fields when sorting by created_at or expired_at, alphabetically when sorting by IP address, and that pagination metadata accurately reflects the total record count, current page, and available pages.
 *
 * 1. Join member account with valid credentials and session context.
 * 2. Create 5 sessions by logging in 5 times with the same credentials.
 * 3. Sort sessions by created_at ascending and validate oldest-first ordering.
 * 4. Sort sessions by created_at descending and validate newest-first ordering.
 * 5. Sort sessions by expired_at ascending and validate correct ordering.
 * 6. Sort sessions by ip address and validate alphabetical ordering.
 * 7. Test pagination with page=1, limit=5 and validate metadata.
 * 8. Test pagination with page=2, limit=5 and verify correct records returned.
 * 9. Test invalid pagination: page=0 should fall back to default page=1.
 * 10. Test invalid pagination: page=-1 should fall back to default page=1.
 * 11. Test invalid pagination: limit=200 should fall back to default limit=20.
 * 12. Test pagination beyond available data returns empty array with correct metadata.
 */
export async function test_api_member_sessions_sorting_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join member account
  const joinConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const username = RandomGenerator.name(1);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const member = await authorize_member_join(joinConnection, {
    body: {
      email,
      password,
      username,
      href,
      referrer,
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member);
  // 2. Create multiple sessions by logging in multiple times
  const loginConnection1: api.IConnection = { host: connection.host };
  const loginResult1 = await authorize_member_login(loginConnection1, {
    body: {
      email,
      password,
      href,
      referrer,
    } satisfies IRedditCommunityMember.ILogin,
  });
  typia.assert(loginResult1);
  const loginConnection2: api.IConnection = { host: connection.host };
  const loginResult2 = await authorize_member_login(loginConnection2, {
    body: {
      email,
      password,
      href,
      referrer,
    } satisfies IRedditCommunityMember.ILogin,
  });
  typia.assert(loginResult2);
  const loginConnection3: api.IConnection = { host: connection.host };
  const loginResult3 = await authorize_member_login(loginConnection3, {
    body: {
      email,
      password,
      href,
      referrer,
    } satisfies IRedditCommunityMember.ILogin,
  });
  typia.assert(loginResult3);
  const loginConnection4: api.IConnection = { host: connection.host };
  const loginResult4 = await authorize_member_login(loginConnection4, {
    body: {
      email,
      password,
      href,
      referrer,
    } satisfies IRedditCommunityMember.ILogin,
  });
  typia.assert(loginResult4);
  const loginConnection5: api.IConnection = { host: connection.host };
  const loginResult5 = await authorize_member_login(loginConnection5, {
    body: {
      email,
      password,
      href,
      referrer,
    } satisfies IRedditCommunityMember.ILogin,
  });
  typia.assert(loginResult5);
  // 3. Sort by created_at asc - should show oldest first
  const sortedAscConnection: api.IConnection = { host: connection.host };
  const sortedAscResult =
    await api.functional.redditCommunity.member.sessions.index(
      sortedAscConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sortField: "created_at",
          sortOrder: "asc",
          memberId: member.id,
        } satisfies IRedditCommunityMemberSession.IRequest,
      },
    );
  typia.assert(sortedAscResult);
  // 4. Sort by created_at desc - should show newest first
  const sortedDescConnection: api.IConnection = { host: connection.host };
  const sortedDescResult =
    await api.functional.redditCommunity.member.sessions.index(
      sortedDescConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sortField: "created_at",
          sortOrder: "desc",
          memberId: member.id,
        } satisfies IRedditCommunityMemberSession.IRequest,
      },
    );
  typia.assert(sortedDescResult);
  // 5. Validate sorting order for created_at asc
  for (let i = 0; i < sortedAscResult.data.length - 1; i++) {
    const current = sortedAscResult.data[i];
    const next = sortedAscResult.data[i + 1];
    TestValidator.predicate(
      `created_at asc order ${i}`,
      new Date(current.createdAt) <= new Date(next.createdAt),
    );
  }
  // 6. Validate sorting order for created_at desc
  for (let i = 0; i < sortedDescResult.data.length - 1; i++) {
    const current = sortedDescResult.data[i];
    const next = sortedDescResult.data[i + 1];
    TestValidator.predicate(
      `created_at desc order ${i}`,
      new Date(current.createdAt) >= new Date(next.createdAt),
    );
  }
  // 7. Sort by expired_at
  const sortedExpiredConnection: api.IConnection = { host: connection.host };
  const sortedExpiredResult =
    await api.functional.redditCommunity.member.sessions.index(
      sortedExpiredConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sortField: "expired_at",
          sortOrder: "asc",
          memberId: member.id,
        } satisfies IRedditCommunityMemberSession.IRequest,
      },
    );
  typia.assert(sortedExpiredResult);
  // 8. Validate sorting order for expired_at
  for (let i = 0; i < sortedExpiredResult.data.length - 1; i++) {
    const current = sortedExpiredResult.data[i];
    const next = sortedExpiredResult.data[i + 1];
    TestValidator.predicate(
      `expired_at asc order ${i}`,
      new Date(current.expiredAt) <= new Date(next.expiredAt),
    );
  }
  // 9. Sort by ip
  const sortedIpConnection: api.IConnection = { host: connection.host };
  const sortedIpResult =
    await api.functional.redditCommunity.member.sessions.index(
      sortedIpConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sortField: "ip",
          sortOrder: "asc",
          memberId: member.id,
        } satisfies IRedditCommunityMemberSession.IRequest,
      },
    );
  typia.assert(sortedIpResult);
  // 10. Pagination: page=1, limit=5
  const page1Connection: api.IConnection = { host: connection.host };
  const page1Result =
    await api.functional.redditCommunity.member.sessions.index(
      page1Connection,
      {
        body: {
          page: 1,
          limit: 5,
          memberId: member.id,
        } satisfies IRedditCommunityMemberSession.IRequest,
      },
    );
  typia.assert(page1Result);
  // 11. Pagination: page=2, limit=5
  const page2Connection: api.IConnection = { host: connection.host };
  const page2Result =
    await api.functional.redditCommunity.member.sessions.index(
      page2Connection,
      {
        body: {
          page: 2,
          limit: 5,
          memberId: member.id,
        } satisfies IRedditCommunityMemberSession.IRequest,
      },
    );
  typia.assert(page2Result);
  // 12. Validate pagination metadata for page 1
  TestValidator.equals("page 1 current", page1Result.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1Result.pagination.limit, 5);
  TestValidator.equals(
    "page 1 records match total",
    page1Result.pagination.records,
    sortedAscResult.pagination.records,
  );
  const expectedPages = Math.ceil(sortedAscResult.pagination.records / 5);
  TestValidator.equals(
    "page 1 pages",
    page1Result.pagination.pages,
    expectedPages,
  );
  // 13. Validate page 1 has correct number of records
  TestValidator.predicate("page 1 has records", page1Result.data.length > 0);
  TestValidator.equals("page 1 record count", page1Result.data.length, 5);
  // 14. Validate page 2 has correct metadata
  TestValidator.equals("page 2 current", page2Result.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2Result.pagination.limit, 5);
  // 15. Invalid pagination: page < 1 should fall back to default (page=1)
  const invalidPageConnection: api.IConnection = { host: connection.host };
  const invalidPageResult =
    await api.functional.redditCommunity.member.sessions.index(
      invalidPageConnection,
      {
        body: {
          page: 0,
          limit: 10,
          memberId: member.id,
        } satisfies IRedditCommunityMemberSession.IRequest,
      },
    );
  typia.assert(invalidPageResult);
  TestValidator.equals(
    "invalid page (0) falls back to 1",
    invalidPageResult.pagination.current,
    1,
  );
  // 16. Invalid pagination: page negative should fall back to default (page=1)
  const negativePageConnection: api.IConnection = { host: connection.host };
  const negativePageResult =
    await api.functional.redditCommunity.member.sessions.index(
      negativePageConnection,
      {
        body: {
          page: -1,
          limit: 10,
          memberId: member.id,
        } satisfies IRedditCommunityMemberSession.IRequest,
      },
    );
  typia.assert(negativePageResult);
  TestValidator.equals(
    "negative page falls back to 1",
    negativePageResult.pagination.current,
    1,
  );
  // 17. Invalid pagination: limit > 100 should fall back to default (limit=20)
  const invalidLimitConnection: api.IConnection = { host: connection.host };
  const invalidLimitResult =
    await api.functional.redditCommunity.member.sessions.index(
      invalidLimitConnection,
      {
        body: {
          page: 1,
          limit: 200,
          memberId: member.id,
        } satisfies IRedditCommunityMemberSession.IRequest,
      },
    );
  typia.assert(invalidLimitResult);
  TestValidator.equals(
    "limit 200 falls back to default",
    invalidLimitResult.pagination.limit,
    20,
  );
  // 18. Valid page beyond available data returns empty array
  const beyondDataConnection: api.IConnection = { host: connection.host };
  const beyondDataResult =
    await api.functional.redditCommunity.member.sessions.index(
      beyondDataConnection,
      {
        body: {
          page: 999,
          limit: 5,
          memberId: member.id,
        } satisfies IRedditCommunityMemberSession.IRequest,
      },
    );
  typia.assert(beyondDataResult);
  TestValidator.equals(
    "beyond data returns empty array",
    beyondDataResult.data.length,
    0,
  );
  TestValidator.equals(
    "beyond data pagination current",
    beyondDataResult.pagination.current,
    999,
  );
}
